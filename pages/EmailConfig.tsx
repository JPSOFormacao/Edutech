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
    
    storageService.saveEmailConfig({ serviceId, templateId, publicKey });
    setStatus({ type: 'success', msg: 'Configurações guardadas com sucesso!' });
    
    setTimeout(() => setStatus(null), 3000);
  };

  const handleTest = async () => {
    setLoading(true);
    setStatus({ type: 'info', msg: 'A tentar enviar email de teste...' });
    
    // Save current values first to ensure test uses latest
    storageService.saveEmailConfig({ serviceId, templateId, publicKey });

    try {
      await emailService.sendTestEmail();
      setStatus({ type: 'success', msg: 'Email de teste enviado com sucesso! Verifique a sua caixa de correio (configurada no EmailJS).' });
    } catch (error: any) {
      setStatus({ type: 'error', msg: 'Falha ao enviar email. Verifique as credenciais na consola ou no EmailJS.' });
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
             <div className={`p-3 rounded text-sm ${
                 status.type === 'success' ? 'bg-green-100 text-green-700' : 
                 status.type === 'error' ? 'bg-red-100 text-red-700' : 
                 'bg-blue-100 text-blue-700'
             }`}>
                 {status.msg}
             </div>
         )}

         <div className="flex justify-between pt-4 border-t mt-4">
             <Button variant="secondary" onClick={handleTest} disabled={loading}>
                 {loading ? 'A Enviar...' : 'Testar Envio'}
             </Button>
             <Button onClick={handleSave}>
                 Guardar Configuração
             </Button>
         </div>
      </div>
    </div>
  );
}