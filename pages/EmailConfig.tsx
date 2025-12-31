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
    const config = storageService.getEmailConfig();
    if (config) {
      setServiceId(config.serviceId);
      setTemplateId(config.templateId);
      setPublicKey(config.publicKey);
    }
  }, []);

  const handleSave = () => {
    if (!serviceId || !templateId || !publicKey) {
      setStatus({ type: 'error', msg: 'Por favor preencha todos os campos.' });
      return;
    }
    
    // Clean inputs before saving
    const cleanConfig = { 
        serviceId: serviceId.trim(), 
        templateId: templateId.trim(), 
        publicKey: publicKey.trim() 
    };
    
    setServiceId(cleanConfig.serviceId);
    setTemplateId(cleanConfig.templateId);
    setPublicKey(cleanConfig.publicKey);

    storageService.saveEmailConfig(cleanConfig);
    setStatus({ type: 'success', msg: 'Configurações guardadas com sucesso!' });
    
    setTimeout(() => setStatus(null), 3000);
  };

  const handleTest = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: 'A iniciar teste de envio...' });
    
    // Save current values first to ensure test uses latest
    const cleanConfig = { 
        serviceId: serviceId.trim(), 
        templateId: templateId.trim(), 
        publicKey: publicKey.trim() 
    };
    storageService.saveEmailConfig(cleanConfig);

    try {
      const result = await emailService.sendTestEmail();
      if (result.success) {
        const successMsg = 'Email de teste enviado com sucesso! Verifique a sua caixa de entrada.';
        setStatus({ type: 'success', msg: successMsg });
        alert(successMsg);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      let errorMsg = error?.message || 'Falha ao enviar email.';
      setStatus({ type: 'error', msg: errorMsg });
      alert("Erro no Teste: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-500 p-2 rounded-lg text-white">
            <Icons.Mail className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Configuração de Email</h2>
            <p className="text-sm text-gray-500">Integração com EmailJS para notificações</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-4">
         <div className="bg-blue-50 p-4 rounded-md border border-blue-100 text-sm text-blue-700 mb-4">
            <p className="font-semibold mb-1">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1">
                <li>Crie uma conta em <a href="https://www.emailjs.com/" target="_blank" className="underline hover:text-blue-900">EmailJS.com</a>.</li>
                <li>Adicione um Serviço de Email (ex: Gmail).</li>
                <li>Crie um Template de Email.</li>
                <li>Copie o <b>Service ID</b>, <b>Template ID</b> e <b>Public Key</b> (Account &gt; General).</li>
            </ol>
         </div>

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
            placeholder="ex: user_xxxxxx ou chave pública"
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
                 {loading ? (
                    <span className="flex items-center">
                        <span className="animate-spin mr-2">⟳</span> A Enviar...
                    </span>
                 ) : 'Testar Envio'}
             </Button>
             <Button onClick={handleSave}>
                 Guardar Configuração
             </Button>
         </div>
      </div>
    </div>
  );
}