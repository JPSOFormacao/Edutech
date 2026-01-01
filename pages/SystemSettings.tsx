import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';
import { useAuth } from '../App';

export default function SystemSettings() {
  const { refreshSystemConfig } = useAuth(); // Hook para atualizar o contexto global
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [platformName, setPlatformName] = useState('');
  const [pipedreamWebhook, setPipedreamWebhook] = useState('');
  
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const config = await storageService.getSystemConfig();
    if (config) {
      setLogoUrl(config.logoUrl || '');
      setFaviconUrl(config.faviconUrl || '');
      setPlatformName(config.platformName || '');
      setPipedreamWebhook(config.pipedreamWebhookUrl || '');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setStatus(null);
    try {
        await storageService.saveSystemConfig({
            logoUrl: logoUrl.trim(),
            faviconUrl: faviconUrl.trim(),
            platformName: platformName.trim(),
            pipedreamWebhookUrl: pipedreamWebhook.trim()
        });
        
        // Atualizar o contexto global para refletir as mudanças imediatamente (Favicon, Logo na Sidebar)
        if (refreshSystemConfig) {
            await refreshSystemConfig();
        }

        setStatus({ type: 'success', msg: 'Configurações de sistema atualizadas com sucesso!' });
    } catch (e: any) {
        setStatus({ type: 'error', msg: 'Erro ao guardar configurações: ' + (e.message || 'Erro desconhecido') });
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-purple-600 p-2 rounded-lg text-white">
            <Icons.Settings className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Configuração de Sistema</h2>
            <p className="text-sm text-gray-500">Personalize o branding e integrações externas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6 space-y-4 h-fit">
              <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                  <Icons.Settings className="w-4 h-4" /> Branding
              </h3>
              <Input 
                label="Nome da Plataforma" 
                value={platformName} 
                onChange={e => setPlatformName(e.target.value)} 
                placeholder="Ex: EduTech PT"
              />
              <Input 
                label="URL do Logótipo (Sidebar)" 
                value={logoUrl} 
                onChange={e => setLogoUrl(e.target.value)} 
                placeholder="https://exemplo.com/logo.png"
              />
              <Input 
                label="URL do Ícone (Favicon)" 
                value={faviconUrl} 
                onChange={e => setFaviconUrl(e.target.value)} 
                placeholder="https://exemplo.com/favicon.ico"
              />
          </div>

          <div className="space-y-6">
               {/* Integrações */}
               <div className="bg-white shadow rounded-lg p-6 space-y-4">
                  <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                      <Icons.Cloud className="w-4 h-4" /> Integrações (Pipedream)
                  </h3>
                  <div>
                      <Input 
                          label="Webhook URL do Pipedream" 
                          value={pipedreamWebhook} 
                          onChange={e => setPipedreamWebhook(e.target.value)} 
                          placeholder="https://eo..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                          Este Webhook será usado na página "Integrações" para enviar ficheiros para o Google Drive.
                      </p>
                  </div>
              </div>

               {/* Preview Section */}
               <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col items-center justify-center gap-6">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Pré-visualização</h4>
                  
                  {/* Logo Preview (Dark Background simulation like Sidebar) */}
                  <div className="w-full bg-slate-900 p-4 rounded-lg flex items-center justify-center gap-2">
                       {logoUrl ? (
                           <img src={logoUrl} alt="Logo Preview" className="h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                       ) : (
                           <Icons.Student className="text-white w-8 h-8" />
                       )}
                       <span className="text-white font-bold text-lg">
                           {platformName || <>EduTech <span className="text-indigo-500">PT</span></>}
                       </span>
                  </div>
                  <p className="text-xs text-gray-400">Aparência na Barra Lateral</p>
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

      <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={loading}>
                {loading ? 'A Guardar...' : 'Guardar Configurações'}
            </Button>
      </div>
    </div>
  );
}