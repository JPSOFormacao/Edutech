import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';
import { EmailTemplates } from '../types';

// Valores padrão para garantir que os inputs nunca ficam undefined
const DEFAULT_TEMPLATES: EmailTemplates = {
    welcomeId: '',
    resetPasswordId: '',
    enrollmentId: '',
    notificationId: '',
    verificationId: ''
};

export default function EmailConfigPage() {
  const [serviceId, setServiceId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  
  // Templates iniciados com padrão
  const [templates, setTemplates] = useState<EmailTemplates>(DEFAULT_TEMPLATES);

  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info' | 'warning', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estado para controlar qual botão de teste específico está a carregar
  const [testingTemplate, setTestingTemplate] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
        const config = await storageService.getEmailConfig();
        if (config) {
          setServiceId(config.serviceId || '');
          setPublicKey(config.publicKey || '');
          
          if (config.templates && Object.keys(config.templates).length > 0) {
              setTemplates((prev) => ({
                  ...DEFAULT_TEMPLATES,
                  ...config.templates
              }));
          } else {
              // Migração legacy
              const legacyTemplate = (config as any).templateId || '';
              if (legacyTemplate) {
                  setTemplates({
                      ...DEFAULT_TEMPLATES,
                      welcomeId: legacyTemplate,
                      resetPasswordId: legacyTemplate,
                      enrollmentId: legacyTemplate,
                      notificationId: legacyTemplate,
                      verificationId: legacyTemplate
                  });
              }
          }
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    if (!serviceId || !publicKey) {
      setStatus({ type: 'error', msg: 'Service ID e Public Key são obrigatórios.' });
      return;
    }
    
    setLoading(true);
    
    const config = { 
        serviceId: serviceId.trim(), 
        // templateId removed to match EmailConfig type
        publicKey: publicKey.trim(),
        templates: templates
    };
    
    try {
        await storageService.saveEmailConfig(config);
        
        setStatus({ type: 'success', msg: 'Configurações guardadas com sucesso!' });
        setTimeout(() => setStatus(null), 3000);
    } catch(e: any) {
        setStatus({ type: 'error', msg: 'Erro crítico: ' + (e.message || 'Falha desconhecida') });
    } finally {
        setLoading(false);
    }
  };

  // Teste Genérico (Botão Fundo)
  const handleTestGeneric = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: 'A iniciar teste de envio...' });
    
    // Auto-save antes de testar para garantir que o serviço lê o mais recente
    await handleSave();

    try {
      const result = await emailService.sendTestEmail();
      if (result.success) {
        setStatus({ type: 'success', msg: 'Email de teste enviado com sucesso para EduTechPT@hotmail.com!' });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      setStatus({ type: 'error', msg: error?.message || 'Falha ao enviar email.' });
    } finally {
      setLoading(false);
    }
  };

  // Teste Específico por Template
  const handleTestSpecific = async (key: keyof EmailTemplates) => {
      setTestingTemplate(prev => ({ ...prev, [key]: true }));
      
      // Salvar rápido para garantir integridade
      await storageService.saveEmailConfig({ 
          serviceId: serviceId.trim(), 
          publicKey: publicKey.trim(), 
          templates 
      });

      try {
          const result = await emailService.sendSpecificTemplateTest(key);
          if (result.success) {
              alert(`Sucesso! Email de teste (${key}) enviado para EduTechPT@hotmail.com`);
          } else {
              alert(`Erro ao enviar: ${result.message}`);
          }
      } catch (e: any) {
          alert(`Erro: ${e.message}`);
      } finally {
          setTestingTemplate(prev => ({ ...prev, [key]: false }));
      }
  };

  const renderTemplateField = (key: keyof EmailTemplates, label: string, placeholder: string) => {
      return (
          <div className="flex gap-2 items-start">
              <div className="flex-1">
                  <Input 
                      label={label} 
                      value={templates[key]} 
                      onChange={e => setTemplates({...templates, [key]: e.target.value})} 
                      placeholder={placeholder}
                  />
              </div>
              <div className="mt-7"> 
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="md"
                    onClick={() => handleTestSpecific(key)}
                    disabled={testingTemplate[key] || loading || !templates[key]}
                    title="Testar este template"
                    className="px-3"
                  >
                      {testingTemplate[key] ? (
                          <span className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full"></span>
                      ) : (
                          <Icons.Mail className="w-4 h-4 text-indigo-600" />
                      )}
                  </Button>
              </div>
          </div>
      );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-500 p-2 rounded-lg text-white">
            <Icons.Mail className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Configuração de Email</h2>
            <p className="text-sm text-gray-500">Gestão de templates e credenciais EmailJS</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credenciais */}
          <div className="bg-white shadow rounded-lg p-6 space-y-4 h-fit">
             <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                 <Icons.Settings className="w-4 h-4" /> Credenciais API
             </h3>
             <Input 
                label="Service ID" 
                value={serviceId} 
                onChange={e => setServiceId(e.target.value)} 
                placeholder="ex: service_xxxxxx"
             />
             <Input 
                label="Public Key" 
                value={publicKey} 
                onChange={e => setPublicKey(e.target.value)} 
                placeholder="ex: user_xxxxxx"
                type="password"
             />
             
             <div className="bg-blue-50 p-4 rounded text-xs text-blue-800 border border-blue-100 mt-4">
                 <p className="mb-2 font-bold">Variáveis para o EmailJS:</p>
                 <ul className="list-disc ml-4 space-y-1">
                     <li><code>to_name</code>: Nome do destinatário</li>
                     <li><code>to_email</code>: Email do destinatário</li>
                     <li><code>message</code>: Corpo da mensagem</li>
                     <li><code>verification_link</code>: Link de confirmação</li>
                     <li><code>password</code>: Senha temporária</li>
                 </ul>
             </div>
          </div>
          
          {/* Templates */}
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
               <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                   <Icons.FileText className="w-4 h-4" /> Templates de Email (IDs)
               </h3>
               <p className="text-xs text-gray-500 mb-4">
                   Insira o ID do template e clique no ícone de email ao lado para enviar um teste específico para <strong>EduTechPT@hotmail.com</strong>.
               </p>
               
               <div className="bg-yellow-50 p-2 rounded border border-yellow-200 mb-2">
                   {renderTemplateField('welcomeId', 'Boas-vindas / Criação de Conta (Padrão)', 'ex: template_welcome')}
               </div>
               
               {renderTemplateField('verificationId', 'Verificação de Email', 'ex: template_verify')}
               {renderTemplateField('resetPasswordId', 'Recuperação de Senha', 'ex: template_reset')}
               {renderTemplateField('notificationId', 'Notificação Genérica', 'ex: template_notify')}
               {renderTemplateField('enrollmentId', 'Notificação de Inscrição', 'ex: template_enroll')}
          </div>
      </div>

      {status && (
            <div className={`p-4 rounded-md text-sm font-medium border ${
                status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                status.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
                status.type === 'warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
                {status.msg}
            </div>
      )}

      <div className="flex justify-between pt-4 border-t">
            <Button variant="secondary" onClick={handleTestGeneric} disabled={loading}>
                {loading ? 'A Enviar...' : 'Teste Geral de Conexão'}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
                {loading ? 'A Guardar...' : 'Guardar Tudo'}
            </Button>
      </div>
    </div>
  );
}