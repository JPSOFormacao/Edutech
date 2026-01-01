import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';
import { EmailTemplates, EmailCustomContent } from '../types';

// Valores padrão
const DEFAULT_TEMPLATES: EmailTemplates = {
    welcomeId: '',
    resetPasswordId: '',
    enrollmentId: '',
    notificationId: '',
    verificationId: ''
};

const DEFAULT_CONTENT: EmailCustomContent = {
    welcomeText: '',
    verificationText: '',
    resetPasswordText: ''
};

export default function EmailConfigPage() {
  const [serviceId, setServiceId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [customErrorMessage, setCustomErrorMessage] = useState('');
  
  const [templates, setTemplates] = useState<EmailTemplates>(DEFAULT_TEMPLATES);
  const [customContent, setCustomContent] = useState<EmailCustomContent>(DEFAULT_CONTENT);

  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info' | 'warning', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'content'>('config');
  
  // Estado para controlar qual botão de teste específico está a carregar
  const [testingTemplate, setTestingTemplate] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
        const config = await storageService.getEmailConfig();
        if (config) {
          setServiceId(config.serviceId || '');
          setPublicKey(config.publicKey || '');
          setCustomErrorMessage(config.customErrorMessage || '');
          
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

          if (config.customContent) {
              setCustomContent(prev => ({...DEFAULT_CONTENT, ...config.customContent}));
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
        publicKey: publicKey.trim(),
        templates: templates,
        customErrorMessage: customErrorMessage.trim(),
        customContent: customContent
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

  // Teste Específico por Template
  const handleTestSpecific = async (key: keyof EmailTemplates) => {
      setTestingTemplate(prev => ({ ...prev, [key]: true }));
      setStatus({ type: 'info', msg: `A testar template '${key}'...` });
      
      // Auto-save antes de testar para garantir que o texto novo é usado
      await storageService.saveEmailConfig({ 
          serviceId: serviceId.trim(), 
          publicKey: publicKey.trim(), 
          templates,
          customErrorMessage,
          customContent
      });

      try {
          const result = await emailService.sendSpecificTemplateTest(key);
          if (result.success) {
              setStatus({ type: 'success', msg: `Sucesso! Email de teste enviado para EduTechPT@hotmail.com` });
              alert(`Sucesso! Verifique o email EduTechPT@hotmail.com`);
          } else {
              setStatus({ type: 'error', msg: `Erro: ${result.message}` });
              alert(`Erro: ${result.message}`);
          }
      } catch (e: any) {
          setStatus({ type: 'error', msg: `Exceção: ${e.message}` });
      } finally {
          setTestingTemplate(prev => ({ ...prev, [key]: false }));
      }
  };

  // Helper para renderizar Input + Botão de Teste
  const renderTemplateField = (key: keyof EmailTemplates, label: string, placeholder: string) => {
      return (
          <div className="flex gap-2 items-start mb-4">
              <div className="flex-1">
                  <Input 
                      label={label} 
                      value={templates[key]} 
                      onChange={e => setTemplates({...templates, [key]: e.target.value})} 
                      placeholder={placeholder}
                      className="mb-0" // Remover margem inferior do Input para alinhar
                  />
              </div>
              <div className="mt-7"> 
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="md"
                    onClick={() => handleTestSpecific(key)}
                    disabled={testingTemplate[key] || loading}
                    title="Enviar teste para EduTechPT@hotmail.com"
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
            <p className="text-sm text-gray-500">Gestão de templates, textos e credenciais EmailJS</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 bg-white px-4 rounded-t-lg pt-4 shadow-sm">
           <button 
             onClick={() => setActiveTab('config')}
             className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'config' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
              Credenciais & IDs
           </button>
           <button 
             onClick={() => setActiveTab('content')}
             className={`px-6 py-3 border-b-2 font-medium text-sm transition-colors ${activeTab === 'content' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
           >
              Personalizar Textos
           </button>
      </div>

      {activeTab === 'config' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Credenciais e Erros */}
            <div className="space-y-6 h-fit">
                <div className="bg-white shadow rounded-lg p-6 space-y-4">
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
                        <p className="mb-2 font-bold">Variáveis disponíveis para os textos:</p>
                        <ul className="list-disc ml-4 space-y-1">
                            <li><code>{`{name}`}</code>: Nome do utilizador</li>
                            <li><code>{`{link}`}</code>: Link de verificação</li>
                            <li><code>{`{email}`}</code>: Email do utilizador</li>
                            <li><code>{`{password}`}</code>: Senha temporária/nova</li>
                            <li><code>{`{training_details}`}</code>: Informação de turmas/cursos</li>
                        </ul>
                    </div>
                </div>

                {/* Mensagem de Erro */}
                <div className="bg-white shadow rounded-lg p-6 space-y-4">
                    <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                        <Icons.Shield className="w-4 h-4" /> Mensagem de Erro Personalizada
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Texto de Fallback (Erro)</label>
                        <textarea 
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                            rows={3}
                            placeholder="Ex: O serviço de email está temporariamente indisponível. Por favor contacte o administrador."
                            value={customErrorMessage}
                            onChange={e => setCustomErrorMessage(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Este texto será exibido aos utilizadores se o envio de email falhar.
                        </p>
                    </div>
                </div>
            </div>
            
            {/* Templates */}
            <div className="bg-white shadow rounded-lg p-6 space-y-1 h-fit">
                <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                    <Icons.FileText className="w-4 h-4" /> Templates de Email (IDs)
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                    Insira o ID do template EmailJS. O conteúdo de texto pode ser editado na aba "Personalizar Textos".
                </p>
                
                <div className="bg-yellow-50 p-2 rounded border border-yellow-200 mb-4">
                    {renderTemplateField('welcomeId', 'Boas-vindas (Padrão)', 'ex: template_welcome')}
                </div>
                
                {renderTemplateField('verificationId', 'Verificação de Email', 'ex: template_verify')}
                {renderTemplateField('resetPasswordId', 'Recuperação de Senha', 'ex: template_reset')}
                {renderTemplateField('notificationId', 'Notificação Genérica', 'ex: template_notify')}
                {renderTemplateField('enrollmentId', 'Notificação de Inscrição', 'ex: template_enroll')}
            </div>
          </div>
      )}

      {activeTab === 'content' && (
          <div className="space-y-6">
              {/* Texto de Boas Vindas */}
              <div className="bg-white shadow rounded-lg p-6 space-y-4">
                   <h3 className="font-bold text-gray-900 border-b pb-2 mb-2">Email de Boas-Vindas</h3>
                   <p className="text-sm text-gray-500 mb-2">
                       Enviado quando um administrador cria uma conta ou aprova um registo.
                       <br/>Variáveis: <code>{`{name}`}</code>, <code>{`{email}`}</code>, <code>{`{password}`}</code>, <code>{`{training_details}`}</code>
                   </p>
                   <textarea 
                       className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono"
                       rows={6}
                       value={customContent.welcomeText || ''}
                       onChange={e => setCustomContent({...customContent, welcomeText: e.target.value})}
                       placeholder={`Bem-vindo à EduTech PT!
          
A sua conta foi criada com sucesso.

{training_details}

As suas credenciais de acesso são:
Email: {email}
Senha Temporária: {password}`}
                   />
              </div>

              {/* Texto de Verificação */}
              <div className="bg-white shadow rounded-lg p-6 space-y-4">
                   <h3 className="font-bold text-gray-900 border-b pb-2 mb-2">Email de Verificação</h3>
                   <p className="text-sm text-gray-500 mb-2">
                       Enviado manualmente ou no registo (se ativado).
                       <br/>Variáveis: <code>{`{name}`}</code>, <code>{`{link}`}</code>
                   </p>
                   <textarea 
                       className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono"
                       rows={6}
                       value={customContent.verificationText || ''}
                       onChange={e => setCustomContent({...customContent, verificationText: e.target.value})}
                       placeholder={`Olá {name},

Obrigado pelo seu registo.
Clique aqui para validar: {link}`}
                   />
              </div>

               {/* Texto de Reset Password */}
               <div className="bg-white shadow rounded-lg p-6 space-y-4">
                   <h3 className="font-bold text-gray-900 border-b pb-2 mb-2">Email de Recuperação de Senha</h3>
                   <p className="text-sm text-gray-500 mb-2">
                       Enviado quando um administrador altera a senha de um utilizador.
                       <br/>Variáveis: <code>{`{name}`}</code>, <code>{`{email}`}</code>, <code>{`{password}`}</code>
                   </p>
                   <textarea 
                       className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono"
                       rows={6}
                       value={customContent.resetPasswordText || ''}
                       onChange={e => setCustomContent({...customContent, resetPasswordText: e.target.value})}
                       placeholder={`Olá {name},
A sua senha foi redefinida.

Novas credenciais:
Email: {email}
Nova Senha: {password}`}
                   />
              </div>
          </div>
      )}

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

      <div className="flex justify-end pt-4 border-t pb-8">
            <Button onClick={handleSave} disabled={loading}>
                {loading ? 'A Guardar...' : 'Guardar Tudo'}
            </Button>
      </div>
    </div>
  );
}