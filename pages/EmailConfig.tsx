import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';
import { EmailTemplates } from '../types';

export default function EmailConfigPage() {
  const [serviceId, setServiceId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  
  // Templates
  const [templates, setTemplates] = useState<EmailTemplates>({
      welcomeId: '',
      resetPasswordId: '',
      enrollmentId: '',
      notificationId: '',
      verificationId: ''
  });

  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const config = await storageService.getEmailConfig();
    if (config) {
      setServiceId(config.serviceId);
      setPublicKey(config.publicKey);
      if (config.templates) {
          setTemplates(config.templates);
      } else {
          // Migração legacy: se só existir templateId antigo, assumir como welcome/general
          const legacyTemplate = (config as any).templateId || '';
          setTemplates({
              welcomeId: legacyTemplate,
              resetPasswordId: legacyTemplate,
              enrollmentId: legacyTemplate,
              notificationId: legacyTemplate,
              verificationId: legacyTemplate
          });
      }
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
        templateId: templates.welcomeId, // Mantendo retrocompatibilidade no campo raiz se necessário
        publicKey: publicKey.trim(),
        templates: templates
    };
    
    try {
        await storageService.saveEmailConfig(config);
        
        // Recarregar da DB para confirmar persistência
        await load();
        
        setStatus({ type: 'success', msg: 'Configurações guardadas com sucesso!' });
        setTimeout(() => setStatus(null), 3000);
    } catch(e) {
        setStatus({ type: 'error', msg: 'Erro ao guardar na base de dados.' });
    } finally {
        setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: 'A iniciar teste de envio (Template Boas-vindas)...' });
    
    const config = { 
        serviceId: serviceId.trim(), 
        templateId: templates.welcomeId,
        publicKey: publicKey.trim(),
        templates: templates
    };
    await storageService.saveEmailConfig(config);

    try {
      const result = await emailService.sendTestEmail();
      if (result.success) {
        setStatus({ type: 'success', msg: 'Email de teste enviado com sucesso!' });
        alert('Email de teste enviado com sucesso!');
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      setStatus({ type: 'error', msg: error?.message || 'Falha ao enviar email.' });
      alert("Erro: " + (error?.message || 'Falha ao enviar'));
    } finally {
      setLoading(false);
    }
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
                 <p>Configure o EmailJS com as variáveis: <code>name</code>, <code>to_email</code>, <code>message</code>, <code>password</code>, <code>training_details</code>.</p>
             </div>
          </div>
          
          {/* Templates */}
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
               <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                   <Icons.FileText className="w-4 h-4" /> Templates de Email (IDs)
               </h3>
               <p className="text-xs text-gray-500">Defina o ID do template EmailJS para cada tipo de ação.</p>
               
               <Input 
                  label="Boas-vindas / Criação de Conta" 
                  value={templates.welcomeId} 
                  onChange={e => setTemplates({...templates, welcomeId: e.target.value})} 
                  placeholder="ex: template_welcome"
               />
               <Input 
                  label="Recuperação de Senha" 
                  value={templates.resetPasswordId} 
                  onChange={e => setTemplates({...templates, resetPasswordId: e.target.value})} 
                  placeholder="ex: template_reset"
               />
               <Input 
                  label="Verificação de Email (Novo)" 
                  value={templates.verificationId} 
                  onChange={e => setTemplates({...templates, verificationId: e.target.value})} 
                  placeholder="ex: template_verify"
               />
               <Input 
                  label="Notificação Genérica" 
                  value={templates.notificationId} 
                  onChange={e => setTemplates({...templates, notificationId: e.target.value})} 
                  placeholder="ex: template_notify"
               />
          </div>
      </div>

      {status && (
            <div className={`p-4 rounded-md text-sm font-medium border ${
                status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                status.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
                'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
                {status.msg}
            </div>
      )}

      <div className="flex justify-between pt-4 border-t">
            <Button variant="secondary" onClick={handleTest} disabled={loading}>
                {loading ? 'A Enviar...' : 'Testar Configuração'}
            </Button>
            <Button onClick={handleSave} disabled={loading}>
                {loading ? 'A Guardar...' : 'Guardar Tudo'}
            </Button>
      </div>
    </div>
  );
}