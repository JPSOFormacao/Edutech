
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { Button, Input, Badge } from '../components/UI';
import { Icons } from '../components/Icons';
import { EmailTemplates, EmailCustomContent, EmailConfig, EmailConfigProfile, EMAIL_KEYS, EMAIL_KEY_LABELS } from '../types';

// Mapeamento de nomes amigáveis para os templates usando as CONSTANTES
const TEMPLATE_DEFINITIONS: { key: keyof EmailTemplates; label: string; desc: string }[] = [
    { key: EMAIL_KEYS.WELCOME, label: EMAIL_KEY_LABELS[EMAIL_KEYS.WELCOME], desc: 'Enviado ao criar conta ou aprovar registo.' },
    { key: EMAIL_KEYS.RECOVERY, label: EMAIL_KEY_LABELS[EMAIL_KEYS.RECOVERY], desc: 'Link para o utilizador redefinir a password.' },
    { key: EMAIL_KEYS.VERIFICATION, label: EMAIL_KEY_LABELS[EMAIL_KEYS.VERIFICATION], desc: 'Link para validar o endereço de email.' },
    { key: EMAIL_KEYS.RESET_PASSWORD, label: EMAIL_KEY_LABELS[EMAIL_KEYS.RESET_PASSWORD], desc: 'Enviado quando o Admin gera uma nova senha manualmente.' },
    { key: EMAIL_KEYS.AUDIT_LOG, label: EMAIL_KEY_LABELS[EMAIL_KEYS.AUDIT_LOG], desc: 'Alertas de segurança e eliminação de ficheiros.' },
    { key: EMAIL_KEYS.ENROLLMENT, label: EMAIL_KEY_LABELS[EMAIL_KEYS.ENROLLMENT], desc: 'Notificação de nova inscrição.' },
    { key: EMAIL_KEYS.NOTIFICATION, label: EMAIL_KEY_LABELS[EMAIL_KEYS.NOTIFICATION], desc: 'Outros avisos do sistema.' },
];

export default function EmailConfigPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [activeTab, setActiveTab] = useState(0); // Para alternar entre Contas (Credenciais)
  const [customErrorMessage, setCustomErrorMessage] = useState('');
  
  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info' | 'warning', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});

  // Estados para o botão de teste
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [successKey, setSuccessKey] = useState<string | null>(null);
  
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

  // --- Funções de Atualização de Credenciais ---
  const handleUpdateProfileCreds = (index: number, field: 'serviceId' | 'publicKey' | 'isActive', value: any) => {
      if (!config) return;
      const updatedProfiles = [...config.profiles];
      updatedProfiles[index] = {
          ...updatedProfiles[index],
          [field]: value
      };
      setConfig({ ...config, profiles: updatedProfiles });
  };

  // --- Funções de Mapeamento de Templates ---
  
  // Encontra qual perfil tem atualmente este template configurado
  const getAssignedProfileIndex = (templateKey: keyof EmailTemplates): number => {
      if (!config) return -1;
      // Retorna o índice do primeiro perfil que tem este template ID preenchido
      return config.profiles.findIndex(p => p.templates[templateKey] && p.templates[templateKey].trim().length > 0);
  };

  // Obtém o valor do ID do template
  const getTemplateIdValue = (templateKey: keyof EmailTemplates): string => {
      if (!config) return '';
      const idx = getAssignedProfileIndex(templateKey);
      if (idx === -1) return '';
      return config.profiles[idx].templates[templateKey] || '';
  };

  // Atualiza o mapeamento: Move o template para o perfil selecionado e limpa dos outros
  const handleUpdateTemplateMapping = (templateKey: keyof EmailTemplates, targetProfileIndex: number, newIdValue: string) => {
      if (!config) return;
      
      const updatedProfiles = config.profiles.map((profile, idx) => {
          const currentTemplates = { ...profile.templates };
          
          if (idx === targetProfileIndex) {
              // Definir o ID neste perfil
              currentTemplates[templateKey] = newIdValue || '';
          } else {
              // Limpar o ID dos outros perfis para garantir 1-to-1
              // Apenas limpamos se estivermos a atribuir explicitamente a outro
              if (targetProfileIndex !== -1) {
                  currentTemplates[templateKey] = ''; 
              }
          }
          return { ...profile, templates: currentTemplates };
      });

      setConfig({ ...config, profiles: updatedProfiles });
  };

  // Função para testar envio de email
  const handleTestEmail = async (key: keyof EmailTemplates) => {
      if (!config) return;
      
      setTestingKey(key as string);
      setSuccessKey(null);
      setStatus(null); // Limpar mensagens anteriores

      // 1. Guardar configurações primeiro para garantir que o serviço usa os dados mais recentes
      // (caso o utilizador tenha acabado de digitar o ID)
      const configToSave: EmailConfig = {
          ...config,
          activeProfileIndex: activeTab, 
          customErrorMessage: customErrorMessage.trim()
      };
      await storageService.saveEmailConfig(configToSave);

      // 2. Tentar enviar
      try {
          const result = await emailService.sendSpecificTemplateTest(key);
          
          if (result.success) {
              // Sucesso: Botão fica verde
              setSuccessKey(key as string);
              setTimeout(() => setSuccessKey(null), 3000); // Reset após 3 segundos
          } else {
              // Erro: Mostra na faixa global para ser legível (detalhes técnicos)
              setStatus({ type: 'error', msg: `Erro ao testar envio: ${result.message}` });
          }
      } catch (e: any) {
          setStatus({ type: 'error', msg: `Exceção: ${e.message}` });
      } finally {
          setTestingKey(null);
      }
  };

  const handleSave = async () => {
    if (!config) return;
    setLoading(true);
    
    // Atualizar índice ativo para UI persistente
    const configToSave: EmailConfig = {
        ...config,
        activeProfileIndex: activeTab, 
        customErrorMessage: customErrorMessage.trim()
    };
    
    try {
        await storageService.saveEmailConfig(configToSave);
        setStatus({ type: 'success', msg: `Configurações globais guardadas com sucesso!` });
        setTimeout(() => setStatus(null), 3000);
    } catch(e: any) {
        setStatus({ type: 'error', msg: 'Erro crítico: ' + (e.message || 'Falha desconhecida') });
    } finally {
        setLoading(false);
    }
  };

  if (!config) return <div className="p-10 text-center">A carregar configurações...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-500 p-2 rounded-lg text-white">
            <Icons.Settings className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Configuração Central de Email</h2>
            <p className="text-sm text-gray-500">Faça a gestão das contas EmailJS e associe cada tipo de email à conta correta.</p>
        </div>
      </div>

      {/* SECÇÃO 1: GESTÃO DE CREDENCIAIS (CONTAS) */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Icons.Users className="w-5 h-5 text-gray-500" /> 
                  1. Contas de Envio (Credenciais)
              </h3>
              <p className="text-xs text-gray-500 mt-1">Configure aqui os Service IDs e Public Keys das suas contas EmailJS.</p>
          </div>
          
          <div className="p-6">
              {/* Tabs para Contas */}
              <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-4 overflow-x-auto">
                      {config.profiles.map((profile, idx) => (
                          <button
                              key={idx}
                              onClick={() => setActiveTab(idx)}
                              className={`${
                                  activeTab === idx
                                      ? 'border-orange-500 text-orange-600 bg-orange-50'
                                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                              } whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 rounded-t-lg`}
                          >
                              Conta #{idx + 1}
                              {profile.isActive ? (
                                  <span className="w-2 h-2 rounded-full bg-green-500" title="Ativa"></span>
                              ) : (
                                  <span className="w-2 h-2 rounded-full bg-gray-300" title="Inativa"></span>
                              )}
                          </button>
                      ))}
                  </nav>
              </div>

              {/* Formuário da Conta Ativa na Tab */}
              {config.profiles.map((profile, idx) => (
                  <div key={idx} className={activeTab === idx ? 'block' : 'hidden'}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                          <div className="space-y-4">
                              <Input 
                                  label="Service ID" 
                                  value={profile.serviceId} 
                                  onChange={e => handleUpdateProfileCreds(idx, 'serviceId', e.target.value)} 
                                  placeholder="ex: service_xxxxxx"
                              />
                              
                              <div className="mb-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Public Key</label>
                                  <div className="relative">
                                      <input 
                                          type={showKeys[idx] ? "text" : "password"}
                                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border pr-10"
                                          placeholder="ex: user_xxxxxx"
                                          value={profile.publicKey}
                                          onChange={e => handleUpdateProfileCreds(idx, 'publicKey', e.target.value)}
                                      />
                                      <button
                                          type="button"
                                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                          onClick={() => setShowKeys(prev => ({...prev, [idx]: !prev[idx]}))}
                                      >
                                          {showKeys[idx] ? <Icons.EyeOff className="w-5 h-5" /> : <Icons.Eye className="w-5 h-5" />}
                                      </button>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 h-full flex flex-col justify-center">
                              <label className="flex items-center cursor-pointer mb-2">
                                  <div className="relative">
                                      <input 
                                          type="checkbox" 
                                          className="sr-only" 
                                          checked={profile.isActive} 
                                          onChange={e => handleUpdateProfileCreds(idx, 'isActive', e.target.checked)}
                                      />
                                      <div className={`block w-10 h-6 rounded-full transition-colors ${profile.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${profile.isActive ? 'transform translate-x-4' : ''}`}></div>
                                  </div>
                                  <div className="ml-3 font-bold text-gray-700">
                                      {profile.isActive ? 'Conta Ativa' : 'Conta Inativa'}
                                  </div>
                              </label>
                              <p className="text-xs text-gray-500">
                                  Use esta opção para ativar ou desativar temporariamente o envio através desta conta sem perder as credenciais.
                              </p>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* SECÇÃO 2: MAPEAMENTO DE TEMPLATES */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Icons.FileText className="w-5 h-5 text-gray-500" /> 
                  2. Associação de Templates
              </h3>
              <p className="text-xs text-gray-500 mt-1">Defina qual conta deve enviar cada tipo de email e insira o ID do template correspondente.</p>
          </div>

          <div className="p-0 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Tipo de Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Enviar Por (Conta)</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template ID (EmailJS)</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {TEMPLATE_DEFINITIONS.map((def) => {
                          const currentProfileIdx = getAssignedProfileIndex(def.key);
                          const currentIdVal = getTemplateIdValue(def.key);
                          // Default to Account 1 (idx 0) if unassigned, purely for UI selection
                          const selectedIdx = currentProfileIdx === -1 ? 0 : currentProfileIdx; 
                          const isProfileActive = config.profiles[selectedIdx]?.isActive;
                          
                          const isEmpty = !currentIdVal || currentIdVal.trim() === '';
                          const isTesting = testingKey === def.key;
                          const isSuccess = successKey === def.key;

                          return (
                              <tr key={def.key} className={`hover:bg-gray-50 transition-colors ${isEmpty ? 'bg-red-50' : ''}`}>
                                  <td className="px-6 py-4">
                                      <div className={`text-sm font-medium ${isEmpty ? 'text-red-700' : 'text-gray-900'}`}>{def.label}</div>
                                      <div className="text-xs text-gray-500">{def.desc}</div>
                                      {isEmpty && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1 rounded">Falta Preencher</span>}
                                  </td>
                                  <td className="px-6 py-4">
                                      <select
                                          className={`block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 border p-2 ${!isProfileActive && currentProfileIdx !== -1 ? 'bg-red-50 text-red-700 border-red-300' : ''}`}
                                          value={selectedIdx}
                                          onChange={(e) => handleUpdateTemplateMapping(def.key, parseInt(e.target.value), currentIdVal)}
                                      >
                                          {config.profiles.map((p, idx) => (
                                              <option key={idx} value={idx}>
                                                  Conta #{idx + 1} {p.isActive ? '(Ativa)' : '(Inativa)'}
                                              </option>
                                          ))}
                                      </select>
                                      {!isProfileActive && currentProfileIdx !== -1 && (
                                          <p className="text-[10px] text-red-600 mt-1 font-bold">⚠️ Esta conta está inativa!</p>
                                      )}
                                  </td>
                                  <td className="px-6 py-4">
                                      <div className="flex gap-2">
                                          <input 
                                              type="text"
                                              className={`block w-full text-sm rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 border p-2 font-mono ${isEmpty ? 'border-red-300 bg-white placeholder-red-300' : 'border-gray-300'}`}
                                              placeholder={`ex: ${def.key}_xxxx`}
                                              value={currentIdVal}
                                              onChange={(e) => handleUpdateTemplateMapping(def.key, selectedIdx, e.target.value)}
                                          />
                                          <Button 
                                            size="sm" 
                                            variant="secondary"
                                            onClick={() => handleTestEmail(def.key)}
                                            disabled={isEmpty || isTesting || isSuccess}
                                            className={`${isSuccess ? '!bg-green-600 !text-white !border-transparent hover:!bg-green-700' : ''} whitespace-nowrap min-w-[80px]`}
                                            title="Guardar e Testar"
                                          >
                                              {isTesting ? (
                                                  <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></span>
                                              ) : isSuccess ? (
                                                  'Enviado'
                                              ) : (
                                                  'Testar'
                                              )}
                                          </Button>
                                      </div>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>

      {/* SECÇÃO 3: MENSAGEM DE ERRO GLOBAL */}
      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-700">Mensagem de Erro (Fallback)</h3>
          </div>
          <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto a apresentar ao utilizador em caso de falha no envio:</label>
              <input 
                  type="text"
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                  value={customErrorMessage}
                  onChange={e => setCustomErrorMessage(e.target.value)}
                  placeholder="Ex: O serviço de email está indisponível. Contacte o suporte."
              />
          </div>
      </div>

      {status && (
            <div className={`p-4 rounded-md text-sm font-bold border flex items-center gap-2 ${
                status.type === 'success' ? 'bg-green-100 text-green-800 border-green-300' : 
                'bg-red-100 text-red-800 border-red-300'
            }`}>
                {status.type === 'success' ? <Icons.Check className="w-5 h-5"/> : <Icons.Close className="w-5 h-5"/>}
                {status.msg}
            </div>
      )}

      <div className="flex justify-end pt-4 pb-8">
            <Button onClick={handleSave} disabled={loading} size="lg" className="w-full sm:w-auto">
                {loading ? 'A Guardar...' : 'Guardar Todas as Configurações'}
            </Button>
      </div>
    </div>
  );
}
