import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';
import { EmailTemplates, EmailCustomContent, EmailConfig, EmailConfigProfile } from '../types';

// Valores padrão
const DEFAULT_TEMPLATES: EmailTemplates = {
    welcomeId: '',
    resetPasswordId: '',
    enrollmentId: '',
    notificationId: '',
    verificationId: '',
    auditLogId: ''
};

export default function EmailConfigPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [activeTab, setActiveTab] = useState(0); // 0 to 4
  const [customErrorMessage, setCustomErrorMessage] = useState('');
  
  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info' | 'warning', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);
  
  const load = async () => {
    try {
        const loadedConfig = await storageService.getEmailConfig();
        if (loadedConfig) {
            setConfig(loadedConfig);
            setCustomErrorMessage(loadedConfig.customErrorMessage || '');
            setActiveTab(loadedConfig.activeProfileIndex || 0);
        }
    } catch (error) {
        console.error("Erro ao carregar configurações:", error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdateProfile = (field: keyof EmailConfigProfile, value: any) => {
      if (!config) return;
      
      const updatedProfiles = [...config.profiles];
      updatedProfiles[activeTab] = {
          ...updatedProfiles[activeTab],
          [field]: value
      };
      
      setConfig({ ...config, profiles: updatedProfiles });
  };

  const handleUpdateTemplate = (key: keyof EmailTemplates, value: string) => {
      if (!config) return;
      
      const currentTemplates = config.profiles[activeTab].templates;
      const updatedTemplates = { ...currentTemplates, [key]: value };
      
      handleUpdateProfile('templates', updatedTemplates);
  };

  const handleSave = async () => {
    if (!config) return;
    
    // Validação básica do perfil ativo (apenas aviso, não bloqueia)
    const currentProfile = config.profiles[activeTab];
    if (!currentProfile.serviceId || !currentProfile.publicKey) {
       if(!confirm("A conta atual parece incompleta (falta Service ID ou Public Key). Deseja guardar mesmo assim?")) {
           return;
       }
    }
    
    setLoading(true);
    
    const configToSave: EmailConfig = {
        ...config,
        activeProfileIndex: activeTab, // O separador atual passa a ser o ativo
        customErrorMessage: customErrorMessage.trim()
    };
    
    try {
        await storageService.saveEmailConfig(configToSave);
        setStatus({ type: 'success', msg: `Configurações guardadas! A Conta #${activeTab + 1} está agora Ativa.` });
        setTimeout(() => setStatus(null), 3000);
    } catch(e: any) {
        setStatus({ type: 'error', msg: 'Erro crítico: ' + (e.message || 'Falha desconhecida') });
    } finally {
        setLoading(false);
    }
  };

  if (!config) return <div className="p-10 text-center">A carregar configurações...</div>;

  const currentProfile = config.profiles[activeTab];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-orange-500 p-2 rounded-lg text-white">
            <Icons.Settings className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Credenciais Email (EmailJS)</h2>
            <p className="text-sm text-gray-500">Gerencie múltiplas contas de envio. Selecione a aba desejada e clique em guardar para ativar.</p>
        </div>
      </div>

      {/* TABS HEADER */}
      <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-2 overflow-x-auto" aria-label="Tabs">
              {config.profiles.map((_, idx) => {
                  const isActive = activeTab === idx;
                  const isSystemActive = config.activeProfileIndex === idx;
                  
                  return (
                      <button
                          key={idx}
                          onClick={() => setActiveTab(idx)}
                          className={`${
                              isActive
                                  ? 'border-orange-500 text-orange-600 bg-orange-50'
                                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          } whitespace-nowrap py-3 px-6 border-b-2 font-medium text-sm rounded-t-lg transition-colors flex items-center gap-2`}
                      >
                          Conta #{idx + 1}
                          {isSystemActive && (
                              <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-green-200">
                                  Ativa
                              </span>
                          )}
                      </button>
                  );
              })}
          </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Lado Esquerdo: Credenciais */}
        <div className="space-y-6 h-fit">
            <div className="bg-white shadow rounded-lg p-6 space-y-4 border-t-4 border-orange-500">
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Icons.Settings className="w-4 h-4" /> 
                        Credenciais da Conta #{activeTab + 1}
                    </h3>
                    {config.activeProfileIndex === activeTab ? (
                        <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                            <Icons.Check className="w-4 h-4" /> Em Uso
                        </span>
                    ) : (
                        <span className="text-xs text-gray-400">Inativa (Clique Guardar para Ativar)</span>
                    )}
                </div>

                <Input 
                    label="Service ID" 
                    value={currentProfile.serviceId} 
                    onChange={e => handleUpdateProfile('serviceId', e.target.value)} 
                    placeholder="ex: service_xxxxxx"
                />
                <Input 
                    label="Public Key" 
                    value={currentProfile.publicKey} 
                    onChange={e => handleUpdateProfile('publicKey', e.target.value)} 
                    placeholder="ex: user_xxxxxx"
                    type="password"
                />
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded border">
                    Estas credenciais ligam a aplicação a esta conta específica do EmailJS.
                </div>
            </div>

            {/* Mensagem de Erro (Global) */}
            <div className="bg-white shadow rounded-lg p-6 space-y-4">
                <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                    <Icons.Shield className="w-4 h-4" /> Mensagem de Erro (Global)
                </h3>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Texto de Fallback</label>
                    <textarea 
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                        rows={3}
                        placeholder="Ex: O serviço de email está temporariamente indisponível."
                        value={customErrorMessage}
                        onChange={e => setCustomErrorMessage(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Comum a todas as contas. Exibido se o envio falhar.
                    </p>
                </div>
            </div>
        </div>
        
        {/* Lado Direito: Templates da Conta Atual */}
        <div className="bg-white shadow rounded-lg p-6 space-y-4 h-fit">
            <h3 className="font-bold text-gray-900 border-b pb-2 mb-4 flex items-center gap-2">
                <Icons.FileText className="w-4 h-4" /> Templates (Conta #{activeTab + 1})
            </h3>
            <p className="text-xs text-gray-500 mb-4 bg-blue-50 p-2 rounded border border-blue-100">
                Insira os IDs dos templates criados NESTA conta do EmailJS.
            </p>
            
            <div className="space-y-4">
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <Input 
                        label="Boas-vindas (Padrão)" 
                        value={currentProfile.templates.welcomeId} 
                        onChange={e => handleUpdateTemplate('welcomeId', e.target.value)} 
                        placeholder="ex: template_welcome"
                        className="mb-0"
                    />
                </div>
                
                <Input 
                    label="Relatório de Auditoria (Ficheiros)" 
                    value={currentProfile.templates.auditLogId || ''} 
                    onChange={e => handleUpdateTemplate('auditLogId', e.target.value)} 
                    placeholder="ex: template_audit"
                    className="border-red-200"
                />

                <Input 
                    label="Verificação de Email" 
                    value={currentProfile.templates.verificationId || ''} 
                    onChange={e => handleUpdateTemplate('verificationId', e.target.value)} 
                    placeholder="ex: template_verify"
                />
                
                <Input 
                    label="Recuperação de Senha" 
                    value={currentProfile.templates.resetPasswordId} 
                    onChange={e => handleUpdateTemplate('resetPasswordId', e.target.value)} 
                    placeholder="ex: template_reset"
                />
                
                <div className="pt-4 border-t border-gray-100 mt-4">
                    <details className="text-sm">
                        <summary className="cursor-pointer text-gray-500 font-medium hover:text-gray-700">Outros Templates</summary>
                        <div className="mt-3 space-y-4 pl-2 border-l-2 border-gray-200">
                            <Input 
                                label="Notificação Genérica" 
                                value={currentProfile.templates.notificationId} 
                                onChange={e => handleUpdateTemplate('notificationId', e.target.value)} 
                                placeholder="ex: template_notify"
                            />
                            
                            <Input 
                                label="Notificação de Inscrição" 
                                value={currentProfile.templates.enrollmentId} 
                                onChange={e => handleUpdateTemplate('enrollmentId', e.target.value)} 
                                placeholder="ex: template_enroll"
                            />
                        </div>
                    </details>
                </div>
            </div>
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
                {loading ? 'A Guardar...' : `Guardar e Ativar Conta #${activeTab + 1}`}
            </Button>
      </div>
    </div>
  );
}