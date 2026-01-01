import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
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

export default function EmailConfigPage() {
  const [serviceId, setServiceId] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [customErrorMessage, setCustomErrorMessage] = useState('');
  
  const [templates, setTemplates] = useState<EmailTemplates>(DEFAULT_TEMPLATES);
  // Mantemos o estado do conteúdo apenas para não o perder ao gravar
  const [savedContent, setSavedContent] = useState<EmailCustomContent>({}); 

  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info' | 'warning', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);
  
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
          }
          
          if (config.customContent) {
              setSavedContent(config.customContent);
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
        customContent: savedContent // Preserva o conteúdo de texto da outra página
    };
    
    try {
        await storageService.saveEmailConfig(config);
        
        setStatus({ type: 'success', msg: 'Credenciais e IDs guardados com sucesso!' });
        setTimeout(() => setStatus(null), 3000);
    } catch(e: any) {
        setStatus({ type: 'error', msg: 'Erro crítico: ' + (e.message || 'Falha desconhecida') });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-500 p-2 rounded-lg text-white">
            <Icons.Settings className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Credenciais Email</h2>
            <p className="text-sm text-gray-500">Configuração técnica do EmailJS e IDs dos Templates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Credenciais e Erros */}
        <div className="space-y-6 h-fit">
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
                <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                    <Icons.Settings className="w-4 h-4" /> Credenciais API (EmailJS)
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
                <div className="text-xs text-gray-500">
                    Estas credenciais ligam a aplicação à sua conta EmailJS.
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
        <div className="bg-white shadow rounded-lg p-6 space-y-4 h-fit">
            <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                <Icons.FileText className="w-4 h-4" /> Templates de Email (IDs)
            </h3>
            <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-2 rounded border border-blue-100">
                Insira o ID do template criado no painel do EmailJS para cada tipo de notificação.
            </p>
            
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <Input 
                    label="Boas-vindas (Padrão)" 
                    value={templates.welcomeId} 
                    onChange={e => setTemplates({...templates, welcomeId: e.target.value})} 
                    placeholder="ex: template_welcome"
                    className="mb-0"
                />
            </div>
            
            <Input 
                label="Verificação de Email" 
                value={templates.verificationId} 
                onChange={e => setTemplates({...templates, verificationId: e.target.value})} 
                placeholder="ex: template_verify"
            />
            
            <Input 
                label="Recuperação de Senha" 
                value={templates.resetPasswordId} 
                onChange={e => setTemplates({...templates, resetPasswordId: e.target.value})} 
                placeholder="ex: template_reset"
            />
            
            <Input 
                label="Notificação Genérica" 
                value={templates.notificationId} 
                onChange={e => setTemplates({...templates, notificationId: e.target.value})} 
                placeholder="ex: template_notify"
            />
            
            <Input 
                label="Notificação de Inscrição" 
                value={templates.enrollmentId} 
                onChange={e => setTemplates({...templates, enrollmentId: e.target.value})} 
                placeholder="ex: template_enroll"
            />
        </div>
      </div>

      {status && (
            <div className={`p-4 rounded-md text-sm font-medium border ${
                status.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                'bg-red-50 text-red-700 border-red-200'
            }`}>
                {status.msg}
            </div>
      )}

      <div className="flex justify-end pt-4 border-t pb-8">
            <Button onClick={handleSave} disabled={loading}>
                {loading ? 'A Guardar...' : 'Guardar Credenciais'}
            </Button>
      </div>
    </div>
  );
}