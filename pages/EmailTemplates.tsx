import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { Button } from '../components/UI';
import { Icons } from '../components/Icons';
import { EmailCustomContent, EmailTemplates } from '../types';

const DEFAULT_CONTENT: EmailCustomContent = {
    welcomeText: '',
    verificationText: '',
    resetPasswordText: '',
    auditLogText: ''
};

export default function EmailTemplatesPage() {
  const [customContent, setCustomContent] = useState<EmailCustomContent>(DEFAULT_CONTENT);
  // Precisamos carregar o resto da config para não perder ao salvar
  const [fullConfig, setFullConfig] = useState<any>({});
  
  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingTemplate, setTestingTemplate] = useState<Record<string, boolean>>({});

  const load = async () => {
    try {
        const config = await storageService.getEmailConfig();
        if (config) {
          setFullConfig(config); // Guardar config completa
          if (config.customContent) {
              setCustomContent(prev => ({...DEFAULT_CONTENT, ...config.customContent}));
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
    setLoading(true);
    
    // Atualizar apenas a parte de content
    const updatedConfig = { 
        ...fullConfig,
        customContent: customContent
    };
    
    try {
        await storageService.saveEmailConfig(updatedConfig);
        setStatus({ type: 'success', msg: 'Textos personalizados guardados com sucesso!' });
        setTimeout(() => setStatus(null), 3000);
    } catch(e: any) {
        setStatus({ type: 'error', msg: 'Erro: ' + (e.message || 'Falha desconhecida') });
    } finally {
        setLoading(false);
    }
  };

  const handleTestSpecific = async (key: keyof EmailTemplates) => {
      setTestingTemplate(prev => ({ ...prev, [key]: true }));
      setStatus({ type: 'info', msg: `A enviar teste para EduTechPT@hotmail.com...` });
      
      // Auto-save temporário para o teste usar o texto atual
      await storageService.saveEmailConfig({ 
          ...fullConfig,
          customContent
      });

      try {
          const result = await emailService.sendSpecificTemplateTest(key);
          if (result.success) {
              setStatus({ type: 'success', msg: `Sucesso! Email de teste enviado.` });
          } else {
              setStatus({ type: 'error', msg: `Erro: ${result.message}` });
          }
      } catch (e: any) {
          setStatus({ type: 'error', msg: `Exceção: ${e.message}` });
      } finally {
          setTestingTemplate(prev => ({ ...prev, [key]: false }));
      }
  };

  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      setStatus({ type: 'info', msg: `Variável ${text} copiada!` });
      setTimeout(() => setStatus(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Icons.MessageSquare className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Personalizar Emails</h2>
            <p className="text-sm text-gray-500">Edite o conteúdo de texto dos emails enviados pelo sistema. <b>HTML é suportado</b>.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editors */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Texto de Boas Vindas */}
              <div className="bg-white shadow rounded-lg p-6 space-y-4 border border-gray-200">
                   <div className="flex justify-between items-start border-b pb-2 mb-2">
                       <div>
                           <h3 className="font-bold text-gray-900">Email de Boas-Vindas <span className="text-xs font-normal text-indigo-600 ml-1">(HTML Suportado)</span></h3>
                           <p className="text-xs text-gray-500 mt-1">Enviado ao criar conta ou aprovar registo.</p>
                       </div>
                       <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleTestSpecific('welcomeId')}
                            disabled={testingTemplate['welcomeId']}
                       >
                           {testingTemplate['welcomeId'] ? '...' : 'Testar Envio'}
                       </Button>
                   </div>
                   <textarea 
                       className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono bg-gray-50"
                       rows={10}
                       value={customContent.welcomeText || ''}
                       onChange={e => setCustomContent({...customContent, welcomeText: e.target.value})}
                       placeholder={`<h1>Bem-vindo à EduTech PT!</h1>
<p>A sua conta foi criada com sucesso.</p>

<p><b>Detalhes da Formação:</b><br/>
{{training_details}}</p>

<p>As suas credenciais de acesso são:<br/>
Email: {{email}}<br/>
Senha: {{password}}</p>`}
                   />
              </div>

              {/* Texto de Auditoria */}
              <div className="bg-white shadow rounded-lg p-6 space-y-4 border border-red-200">
                   <div className="flex justify-between items-start border-b pb-2 mb-2">
                       <div>
                           <h3 className="font-bold text-gray-900 flex items-center gap-2">
                               <Icons.Shield className="w-4 h-4 text-red-500" /> Relatório de Ficheiros <span className="text-xs font-normal text-red-600 ml-1">(HTML Suportado)</span>
                           </h3>
                           <p className="text-xs text-gray-500 mt-1">Enviado ao admin quando 10 ficheiros são apagados.</p>
                       </div>
                       <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleTestSpecific('auditLogId')}
                            disabled={testingTemplate['auditLogId']}
                       >
                           {testingTemplate['auditLogId'] ? '...' : 'Testar Envio'}
                       </Button>
                   </div>
                   <textarea 
                       className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono bg-red-50"
                       rows={8}
                       value={customContent.auditLogText || ''}
                       onChange={e => setCustomContent({...customContent, auditLogText: e.target.value})}
                       placeholder={`<h3>Relatório de Auditoria</h3>
<p>O sistema detetou a eliminação de <b>{{total_files}}</b> ficheiros.</p>

<hr/>
<pre>{{file_list}}</pre>
<hr/>`}
                   />
              </div>

              {/* Texto de Verificação */}
              <div className="bg-white shadow rounded-lg p-6 space-y-4 border border-gray-200">
                   <div className="flex justify-between items-start border-b pb-2 mb-2">
                       <div>
                           <h3 className="font-bold text-gray-900">Email de Verificação <span className="text-xs font-normal text-indigo-600 ml-1">(HTML Suportado)</span></h3>
                           <p className="text-xs text-gray-500 mt-1">Enviado para validar o endereço de email.</p>
                       </div>
                       <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleTestSpecific('verificationId')}
                            disabled={testingTemplate['verificationId']}
                       >
                           {testingTemplate['verificationId'] ? '...' : 'Testar Envio'}
                       </Button>
                   </div>
                   <textarea 
                       className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono bg-gray-50"
                       rows={6}
                       value={customContent.verificationText || ''}
                       onChange={e => setCustomContent({...customContent, verificationText: e.target.value})}
                       placeholder={`<p>Olá {{name}},</p>
<p>Obrigado pelo seu registo.</p>
<a href="{{link}}">Clique aqui para validar a sua conta</a>`}
                   />
              </div>

               {/* Texto de Reset Password */}
               <div className="bg-white shadow rounded-lg p-6 space-y-4 border border-gray-200">
                   <div className="flex justify-between items-start border-b pb-2 mb-2">
                       <div>
                           <h3 className="font-bold text-gray-900">Recuperação de Senha <span className="text-xs font-normal text-indigo-600 ml-1">(HTML Suportado)</span></h3>
                           <p className="text-xs text-gray-500 mt-1">Enviado quando a senha é redefinida pelo admin.</p>
                       </div>
                       <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => handleTestSpecific('resetPasswordId')}
                            disabled={testingTemplate['resetPasswordId']}
                       >
                           {testingTemplate['resetPasswordId'] ? '...' : 'Testar Envio'}
                       </Button>
                   </div>
                   <textarea 
                       className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono bg-gray-50"
                       rows={6}
                       value={customContent.resetPasswordText || ''}
                       onChange={e => setCustomContent({...customContent, resetPasswordText: e.target.value})}
                       placeholder={`<p>Olá {{name}},</p>
<p>A sua senha foi redefinida.</p>
<p><b>Nova Senha:</b> {{password}}</p>`}
                   />
              </div>
          </div>

          {/* Variables Legend (Sticky Sidebar) */}
          <div className="lg:col-span-1">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 sticky top-6 shadow-sm">
                  <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Icons.FileText className="w-5 h-5" /> Variáveis Disponíveis
                  </h3>
                  <p className="text-xs text-blue-700 mb-4">
                      Copie e cole estas variáveis no texto. Elas serão substituídas automaticamente pelos dados reais.
                  </p>
                  
                  <ul className="space-y-3">
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{name}}`}</code>
                              <span className="text-xs text-gray-600">Nome de exibição do utilizador.</span>
                          </div>
                          <button onClick={() => handleCopy('{{name}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{email}}`}</code>
                              <span className="text-xs text-gray-600">Endereço de email do utilizador.</span>
                          </div>
                          <button onClick={() => handleCopy('{{email}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{password}}`}</code>
                              <span className="text-xs text-gray-600">A senha gerada (Boas-vindas/Reset).</span>
                          </div>
                          <button onClick={() => handleCopy('{{password}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{link}}`}</code>
                              <span className="text-xs text-gray-600">Link clicável (Verificação).</span>
                          </div>
                          <button onClick={() => handleCopy('{{link}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{training_details}}`}</code>
                              <span className="text-xs text-gray-600">Lista com Turma e Cursos.</span>
                          </div>
                          <button onClick={() => handleCopy('{{training_details}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-red-50 p-2 rounded border border-red-200 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-red-600 font-bold block mb-1">{`{{file_list}}`}</code>
                              <span className="text-xs text-gray-600">Lista de ficheiros (Auditoria).</span>
                          </div>
                          <button onClick={() => handleCopy('{{file_list}}')} className="text-gray-400 hover:text-red-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-red-50 p-2 rounded border border-red-200 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-red-600 font-bold block mb-1">{`{{total_files}}`}</code>
                              <span className="text-xs text-gray-600">Total de ficheiros (Auditoria).</span>
                          </div>
                          <button onClick={() => handleCopy('{{total_files}}')} className="text-gray-400 hover:text-red-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                  </ul>
              </div>
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

      <div className="flex justify-end pt-4 border-t pb-8">
            <Button onClick={handleSave} disabled={loading}>
                {loading ? 'A Guardar...' : 'Guardar Alterações'}
            </Button>
      </div>
    </div>
  );
}