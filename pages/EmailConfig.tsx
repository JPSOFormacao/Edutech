import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';

export default function EmailConfigPage() {
  const [serviceId, setServiceId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
        const config = await storageService.getEmailConfig();
        if (config) {
          setServiceId(config.serviceId);
          setTemplateId(config.templateId);
          setPublicKey(config.publicKey);
        }
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!serviceId || !templateId || !publicKey) {
      setStatus({ type: 'error', msg: 'Por favor preencha todos os campos.' });
      return;
    }
    
    const cleanConfig = { 
        serviceId: serviceId.trim(), 
        templateId: templateId.trim(), 
        publicKey: publicKey.trim() 
    };
    
    setServiceId(cleanConfig.serviceId);
    setTemplateId(cleanConfig.templateId);
    setPublicKey(cleanConfig.publicKey);

    await storageService.saveEmailConfig(cleanConfig);
    setStatus({ type: 'success', msg: 'Configurações guardadas com sucesso!' });
    
    setTimeout(() => setStatus(null), 3000);
  };

  const handleTest = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: 'A iniciar teste de envio...' });
    
    const cleanConfig = { 
        serviceId: serviceId.trim(), 
        templateId: templateId.trim(), 
        publicKey: publicKey.trim() 
    };
    await storageService.saveEmailConfig(cleanConfig);

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
            <p className="text-sm text-gray-500">Integração com EmailJS para notificações</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6 space-y-4">
             <h3 className="font-bold text-gray-900 border-b pb-2 mb-4">Credenciais API</h3>
             <Input 
                label="Service ID" 
                value={serviceId} 
                onChange={e => setServiceId(e.target.value)} 
                placeholder="ex: service_xxxxxx"
             />
             <Input 
                label="Template ID" 
                value={templateId} 
                onChange={e => setTemplateId(e.target.value)} 
                placeholder="ex: template_xxxxxx"
             />
             <Input 
                label="Public Key" 
                value={publicKey} 
                onChange={e => setPublicKey(e.target.value)} 
                placeholder="ex: user_xxxxxx"
                type="password"
             />

             {status && (
                 <div className={`p-4 rounded-md text-sm font-medium border ${
                     status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                     status.type === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 
                     'bg-blue-50 text-blue-700 border-blue-200'
                 }`}>
                     {status.msg}
                 </div>
             )}

             <div className="flex justify-between pt-4 border-t mt-4">
                 <Button variant="secondary" onClick={handleTest} disabled={loading}>
                     {loading ? 'A Enviar...' : 'Testar Envio'}
                 </Button>
                 <Button onClick={handleSave}>
                     Guardar
                 </Button>
             </div>
          </div>
          
          <div className="space-y-6">
               <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 text-blue-900">
                    <p className="text-sm">Configure o EmailJS com as variáveis: <code>name</code>, <code>to_email</code>, <code>message</code>, <code>password</code>.</p>
               </div>
          </div>
      </div>
    </div>
  );
}