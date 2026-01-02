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
  const [pipedreamDeleteUrl, setPipedreamDeleteUrl] = useState('');
  const [tempPassHours, setTempPassHours] = useState(48); // Default
  
  const [status, setStatus] = useState<{type: 'success' | 'error', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

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
      setPipedreamDeleteUrl(config.pipedreamDeleteUrl || '');
      setTempPassHours(config.tempPasswordValidityHours || 48);
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
            pipedreamWebhookUrl: pipedreamWebhook.trim(),
            pipedreamDeleteUrl: pipedreamDeleteUrl.trim(),
            tempPasswordValidityHours: Number(tempPassHours)
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

  const handleTestWebhook = async (url: string, type: 'upload' | 'delete') => {
      if (!url) {
          alert("Guarde um URL primeiro antes de testar.");
          return;
      }
      
      setTesting(type);
      try {
          // Payload fictício para o Pipedream reconhecer a estrutura
          const payload = type === 'upload' 
            ? { 
                filename: "teste_conexao.txt", 
                originalFilename: "teste_conexao.txt",
                mimetype: "text/plain",
                size: 1024,
                fileData: "VGhpcyBpcyBhIHRlc3QgZmlsZSBmb3IgUGlwZWRyZWFtIGNvbmZpZ3VyYXRpb24u", // Base64 dummy
                uploadedBy: "Admin Teste", 
                timestamp: new Date().toISOString() 
              }
            : { 
                fileId: "TESTE_ID_123", 
                action: "delete" 
              };

          // Disparar sem esperar resposta complexa, apenas para gerar o evento lá
          await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          
          alert(`Dados de teste enviados para o ${type === 'upload' ? 'Upload' : 'Delete'}!\n\nVá agora ao Pipedream e verifique se o evento apareceu.`);
      } catch (e: any) {
          alert("Erro ao tentar contactar o Webhook: " + e.message);
      } finally {
          setTesting(null);
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
                  <Icons.Settings className="w-4 h-4" /> Branding & Segurança
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
              
              <div className="pt-2 border-t mt-4">
                  <Input 
                    label="Validade da Senha Temporária (Horas)" 
                    type="number"
                    min="1"
                    value={tempPassHours} 
                    onChange={e => setTempPassHours(parseInt(e.target.value))} 
                    placeholder="48"
                  />
                  <p className="text-xs text-gray-500">
                      Define quanto tempo o utilizador tem para fazer o primeiro login após receber uma senha temporária.
                  </p>
              </div>
          </div>

          <div className="space-y-6">
               {/* Integrações */}
               <div className="bg-white shadow rounded-lg p-6 space-y-4">
                  <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                      <Icons.Cloud className="w-4 h-4" /> Integrações (Pipedream)
                  </h3>
                  <div>
                      <div className="flex items-end gap-2 mb-4">
                          <div className="flex-1">
                              <Input 
                                  label="Webhook Upload (Enviar Ficheiro)" 
                                  value={pipedreamWebhook} 
                                  onChange={e => setPipedreamWebhook(e.target.value)} 
                                  placeholder="https://eo..."
                                  className="mb-0"
                              />
                          </div>
                          <div className="pb-1">
                              <Button 
                                type="button" 
                                size="sm" 
                                variant="secondary" 
                                onClick={() => handleTestWebhook(pipedreamWebhook, 'upload')}
                                disabled={!pipedreamWebhook || testing === 'upload'}
                                title="Enviar dados de teste"
                              >
                                  {testing === 'upload' ? '...' : 'Testar'}
                              </Button>
                          </div>
                      </div>
                      
                      <div className="flex items-end gap-2">
                          <div className="flex-1">
                              <Input 
                                  label="Webhook Delete (Apagar Ficheiro)" 
                                  value={pipedreamDeleteUrl} 
                                  onChange={e => setPipedreamDeleteUrl(e.target.value)} 
                                  placeholder="https://eo..."
                                  className="mb-0"
                              />
                          </div>
                          <div className="pb-1">
                              <Button 
                                type="button" 
                                size="sm" 
                                variant="secondary" 
                                onClick={() => handleTestWebhook(pipedreamDeleteUrl, 'delete')}
                                disabled={!pipedreamDeleteUrl || testing === 'delete'}
                                title="Enviar dados de teste"
                              >
                                  {testing === 'delete' ? '...' : 'Testar'}
                              </Button>
                          </div>
                      </div>
                      
                      <div className="bg-yellow-50 p-2 rounded text-xs text-yellow-800 border border-yellow-200 mt-4">
                          <p>
                              <strong>Dica:</strong> Se o evento não aparecer no Pipedream, clique no botão "Testar" acima. Isso enviará dados fictícios para que o Pipedream detete a estrutura necessária.
                          </p>
                      </div>
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