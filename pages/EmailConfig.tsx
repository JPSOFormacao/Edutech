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
      
      // Deteção inteligente de erros comuns
      if (errorMsg.toLowerCase().includes('invalid grant') || errorMsg.toLowerCase().includes('reconnect')) {
          errorMsg = "ERRO DE PERMISSÃO (Invalid Grant): A conexão entre o EmailJS e o seu Outlook/Gmail expirou. Vá ao painel do EmailJS > Email Services e clique em 'Reconnect'.";
      }

      setStatus({ type: 'error', msg: errorMsg });
      alert("Erro no Teste:\n" + errorMsg);
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
          
          {/* Coluna Esquerda: Formulário */}
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
                     Guardar
                 </Button>
             </div>
          </div>

          {/* Coluna Direita: Instruções */}
          <div className="space-y-6">
              <div className="bg-blue-50 p-5 rounded-lg border border-blue-100 text-blue-900">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <Icons.Settings className="w-5 h-5" /> 
                    Como Configurar o Template
                </h3>
                <p className="text-sm mb-4">
                    No painel do EmailJS, vá a <b>Email Templates</b>, selecione o seu template e configure os campos exatamente assim:
                </p>

                <div className="space-y-4">
                    <div className="bg-white p-3 rounded border border-blue-200">
                        <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Aba "Settings" (Importante!)</span>
                        <div className="text-sm">
                            <span className="font-semibold">To Email:</span> <code className="bg-gray-100 px-1 rounded text-red-600">{"{{to_email}}"}</code>
                        </div>
                        <div className="text-sm mt-1">
                            <span className="font-semibold">From Name:</span> <code className="bg-gray-100 px-1 rounded">{"{{from_name}}"}</code>
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded border border-blue-200">
                        <span className="text-xs font-bold text-gray-500 uppercase block mb-1">Aba "Content" (Corpo do Email)</span>
                        <p className="text-xs text-gray-600 mb-2">Copie e cole este exemplo para incluir os detalhes da turma/curso:</p>
                        <pre className="text-xs bg-gray-900 text-green-400 p-2 rounded overflow-x-auto">
{`Olá {{name}},

{{message}}

Detalhes da Inscrição:
{{training_details}}

As suas credenciais:
Email: {{to_email}}
Senha: {{password}}

Obrigado.`}
                        </pre>
                    </div>
                </div>
             </div>

             <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-sm text-yellow-800">
                    <p className="font-bold flex items-center gap-1">
                        <span className="text-xl">⚠️</span> Protocolos (Variáveis)
                    </p>
                    <ul className="mt-1 list-disc list-inside text-xs">
                        <li><b>{"{{name}}"}</b>: Nome do utilizador</li>
                        <li><b>{"{{to_email}}"}</b>: Email do utilizador</li>
                        <li><b>{"{{password}}"}</b>: Senha gerada</li>
                        <li><b>{"{{training_details}}"}</b>: Informação sobre Turma/Cursos (ou texto de fallback)</li>
                    </ul>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-sm text-red-800">
                    <p className="font-bold flex items-center gap-1">
                        <span className="text-xl">🚫</span> Erro "Invalid Grant"
                    </p>
                    <p className="mt-1">
                        A conexão com o Outlook/Gmail expirou. Vá ao painel do EmailJS &gt; <b>Email Services</b> e clique em <b>Reconnect Account</b>.
                    </p>
                </div>
             </div>
          </div>
      </div>
    </div>
  );
}