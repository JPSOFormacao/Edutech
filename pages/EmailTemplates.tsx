
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
    recoveryEmailText: '',
    auditLogText: '',
    enrollmentText: '',
    notificationText: ''
};

// --- Sub-component for individual template sections ---
interface EmailSectionEditorProps {
    title: string;
    description: string;
    value: string;
    onChange: (val: string) => void;
    onTest: () => void;
    isTesting: boolean;
    placeholder: string;
    colorClass?: string; // e.g., 'border-red-200'
    forcePreviewTrigger?: number; // Change this to force preview mode
}

const EmailSectionEditor: React.FC<EmailSectionEditorProps> = ({
    title,
    description,
    value,
    onChange,
    onTest,
    isTesting,
    placeholder,
    colorClass = 'border-gray-200',
    forcePreviewTrigger
}) => {
    const [mode, setMode] = useState<'edit' | 'preview'>('preview');

    useEffect(() => {
        if (forcePreviewTrigger) {
            setMode('preview');
        }
    }, [forcePreviewTrigger]);

    return (
        <div className={`bg-white shadow rounded-lg p-6 space-y-4 border ${colorClass} transition-all duration-300`}>
            <div className="flex justify-between items-start border-b pb-2 mb-2">
                <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        {title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{description}</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-gray-100 rounded p-1">
                        <button
                            onClick={() => setMode('preview')}
                            className={`p-1.5 rounded transition-all ${mode === 'preview' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Visualizar"
                        >
                            <Icons.Eye className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setMode('edit')}
                            className={`p-1.5 rounded transition-all ${mode === 'edit' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Editar Código / Texto"
                        >
                            <Icons.Code className="w-4 h-4" />
                        </button>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={onTest}
                        disabled={isTesting}
                    >
                        {isTesting ? '...' : 'Testar Envio'}
                    </Button>
                </div>
            </div>

            {mode === 'edit' ? (
                <div className="relative animate-fade-in">
                    <div className="absolute top-0 right-0 -mt-6 text-[10px] text-gray-400 font-mono bg-gray-50 px-2 rounded-t border-t border-x">Editor de Código</div>
                    <textarea
                        className={`shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm rounded-md p-3 border font-mono text-xs leading-relaxed ${colorClass.replace('border-', 'bg-').replace('-200', '-50')} min-h-[250px]`}
                        rows={10}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={placeholder}
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">Suporta HTML e Texto Simples</p>
                </div>
            ) : (
                <div className="relative animate-fade-in">
                    <div className="absolute top-0 right-0 -mt-6 text-[10px] text-indigo-400 font-bold bg-indigo-50 px-2 rounded-t border-t border-x border-indigo-100">Modo Visualização</div>
                    <div
                        className={`w-full min-h-[250px] rounded-md p-4 border bg-white prose prose-sm max-w-none overflow-y-auto ${colorClass}`}
                        style={{ whiteSpace: 'pre-wrap' }} // Preserves newlines for text mode while allowing HTML
                        dangerouslySetInnerHTML={{
                            __html: value 
                                ? value.replace(/{{/g, '<span class="text-pink-600 font-bold bg-pink-50 px-1 rounded">{{').replace(/}}/g, '}}</span>') // Highlight variables
                                : '<span class="text-gray-400 italic">Sem conteúdo definido.</span>'
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default function EmailTemplatesPage() {
  const [customContent, setCustomContent] = useState<EmailCustomContent>(DEFAULT_CONTENT);
  const [fullConfig, setFullConfig] = useState<any>({});
  
  const [status, setStatus] = useState<{type: 'success' | 'error' | 'info', msg: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingTemplate, setTestingTemplate] = useState<Record<string, boolean>>({});
  
  // Trigger to reset views to preview mode after save
  const [saveTrigger, setSaveTrigger] = useState(0);

  const load = async () => {
    try {
        const config = await storageService.getEmailConfig();
        if (config) {
          setFullConfig(config);
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
    
    const updatedConfig = { 
        ...fullConfig,
        customContent: customContent
    };
    
    try {
        await storageService.saveEmailConfig(updatedConfig);
        setStatus({ type: 'success', msg: 'Textos personalizados guardados com sucesso!' });
        setSaveTrigger(prev => prev + 1); // Force preview mode on all editors
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
            <p className="text-sm text-gray-500">Edite o conteúdo de texto ou HTML dos emails enviados pelo sistema.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editors */}
          <div className="lg:col-span-2 space-y-6">
              
              <EmailSectionEditor 
                  title="Email de Boas-Vindas"
                  description="Enviado ao criar conta ou aprovar registo."
                  value={customContent.welcomeText || ''}
                  onChange={(val) => setCustomContent({...customContent, welcomeText: val})}
                  onTest={() => handleTestSpecific('welcomeId')}
                  isTesting={testingTemplate['welcomeId']}
                  forcePreviewTrigger={saveTrigger}
                  placeholder={`<h1>Bem-vindo à EduTech PT!</h1>
<p>A sua conta foi criada com sucesso.</p>

<p><b>Detalhes da Formação:</b><br/>
{{training_details}}</p>

<p>As suas credenciais de acesso são:<br/>
Email: {{email}}<br/>
Senha: {{password}}</p>

<p>Aceda aqui: {{site_link}}</p>
<p>Atenção: A sua senha expira em {{password_validity}}.</p>`}
              />

              <EmailSectionEditor 
                  title="Link de Recuperação de Acesso"
                  description="Enviado quando o utilizador clica em 'Esqueci a password'."
                  value={customContent.recoveryEmailText || ''}
                  onChange={(val) => setCustomContent({...customContent, recoveryEmailText: val})}
                  onTest={() => handleTestSpecific('recoveryId')}
                  isTesting={testingTemplate['recoveryId']}
                  forcePreviewTrigger={saveTrigger}
                  placeholder={`<p>Olá {{name}},</p>
<p>Recebemos um pedido para recuperar o acesso à sua conta.</p>
<p>Clique no link abaixo para criar uma nova password:</p>
<a href="{{recovery_link}}">{{recovery_link}}</a>
<p>O link expira em 24 horas.</p>`}
              />

              <EmailSectionEditor 
                  title="Inscrição em Curso"
                  description="Enviado ao aluno quando o Administrador aprova uma inscrição específica."
                  value={customContent.enrollmentText || ''}
                  onChange={(val) => setCustomContent({...customContent, enrollmentText: val})}
                  onTest={() => handleTestSpecific('enrollmentId')}
                  isTesting={testingTemplate['enrollmentId']}
                  forcePreviewTrigger={saveTrigger}
                  placeholder={`<p>Olá {{name}},</p>
<p>A sua inscrição no curso <b>{{course_name}}</b> foi aprovada com sucesso!</p>
<p>Já pode aceder aos conteúdos na plataforma.</p>
<a href="{{site_link}}">Ir para a Plataforma</a>`}
              />

              <EmailSectionEditor 
                  title="Email de Verificação"
                  description="Enviado para validar o endereço de email."
                  value={customContent.verificationText || ''}
                  onChange={(val) => setCustomContent({...customContent, verificationText: val})}
                  onTest={() => handleTestSpecific('verificationId')}
                  isTesting={testingTemplate['verificationId']}
                  forcePreviewTrigger={saveTrigger}
                  placeholder={`<p>Olá {{name}},</p>
<p>Obrigado pelo seu registo.</p>
<a href="{{link}}">Clique aqui para validar a sua conta</a>`}
              />

              <EmailSectionEditor 
                  title="Reset de Senha (Admin)"
                  description="Enviado quando o Admin redefine a senha manualmente."
                  value={customContent.resetPasswordText || ''}
                  onChange={(val) => setCustomContent({...customContent, resetPasswordText: val})}
                  onTest={() => handleTestSpecific('resetPasswordId')}
                  isTesting={testingTemplate['resetPasswordId']}
                  forcePreviewTrigger={saveTrigger}
                  placeholder={`<p>Olá {{name}},</p>
<p>A sua senha foi redefinida pelo administrador.</p>
<p><b>Nova Senha:</b> {{password}}</p>
<p>Esta senha é válida por {{password_validity}}.</p>
<p>Aceda: {{site_link}}</p>`}
              />

              <EmailSectionEditor 
                  title="Notificação Genérica"
                  description="Utilizado para avisos diversos do sistema."
                  value={customContent.notificationText || ''}
                  onChange={(val) => setCustomContent({...customContent, notificationText: val})}
                  onTest={() => handleTestSpecific('notificationId')}
                  isTesting={testingTemplate['notificationId']}
                  forcePreviewTrigger={saveTrigger}
                  placeholder={`<p>Olá {{name}},</p>
<p>{{message}}</p>
<hr/>
<p>Equipa EduTech PT</p>`}
              />

              <EmailSectionEditor 
                  title="Relatório de Auditoria (Ficheiros)"
                  description="Enviado ao admin quando 10 ficheiros são apagados."
                  value={customContent.auditLogText || ''}
                  onChange={(val) => setCustomContent({...customContent, auditLogText: val})}
                  onTest={() => handleTestSpecific('auditLogId')}
                  isTesting={testingTemplate['auditLogId']}
                  colorClass="border-red-200"
                  forcePreviewTrigger={saveTrigger}
                  placeholder={`<h3>Relatório de Auditoria</h3>
<p>O sistema detetou a eliminação de <b>{{total_files}}</b> ficheiros.</p>

<hr/>
<pre>{{file_list}}</pre>
<hr/>`}
              />
          </div>

          {/* Variables Legend (Sticky Sidebar) */}
          <div className="lg:col-span-1">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 sticky top-6 shadow-sm">
                  <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                      <Icons.FileText className="w-5 h-5" /> Variáveis Disponíveis
                  </h3>
                  <p className="text-xs text-blue-700 mb-4">
                      Copie e cole estas variáveis no editor. Elas serão substituídas automaticamente pelos dados reais.
                  </p>
                  
                  <ul className="space-y-3">
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{recovery_link}}`}</code>
                              <span className="text-xs text-gray-600">URL para redefinir password (esqueci-me).</span>
                          </div>
                          <button onClick={() => handleCopy('{{recovery_link}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{link}}`}</code>
                              <span className="text-xs text-gray-600">Link de verificação de email.</span>
                          </div>
                          <button onClick={() => handleCopy('{{link}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{password}}`}</code>
                              <span className="text-xs text-gray-600">A Password/Senha gerada (Boas-vindas/Reset).</span>
                          </div>
                          <button onClick={() => handleCopy('{{password}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{course_name}}`}</code>
                              <span className="text-xs text-gray-600">Nome do curso (apenas template Inscrição).</span>
                          </div>
                          <button onClick={() => handleCopy('{{course_name}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{message}}`}</code>
                              <span className="text-xs text-gray-600">Mensagem da notificação (apenas template Notificação).</span>
                          </div>
                          <button onClick={() => handleCopy('{{message}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{mailto_link}}`}</code>
                              <span className="text-xs text-gray-600">Link de email para o sistema.</span>
                          </div>
                          <button onClick={() => handleCopy('{{mailto_link}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
                      <li className="bg-white p-2 rounded border border-blue-100 shadow-sm flex justify-between items-start">
                          <div>
                              <code className="text-pink-600 font-bold block mb-1">{`{{site_link}}`}</code>
                              <span className="text-xs text-gray-600">Link para a página inicial do site.</span>
                          </div>
                          <button onClick={() => handleCopy('{{site_link}}')} className="text-gray-400 hover:text-indigo-600 p-1" title="Copiar">
                              <Icons.Copy className="w-4 h-4" />
                          </button>
                      </li>
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
