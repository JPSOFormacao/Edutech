
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabaseClient';
import { Button, Badge } from '../components/UI';
import { Icons } from '../components/Icons';
import { EmailTemplates, EmailConfigProfile, EMAIL_KEYS } from '../types';

type CheckStatus = 'pending' | 'ok' | 'warning' | 'error';

interface DiagnosticResult {
    category: string;
    items: DiagnosticItem[];
}

interface DiagnosticItem {
    id: string;
    label: string;
    status: CheckStatus;
    message: string;
    actionLabel?: string;
    actionLink?: string;
}

export default function SystemDiagnostics() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [lastRun, setLastRun] = useState<Date | null>(null);
    const [results, setResults] = useState<DiagnosticResult[]>([]);

    const runDiagnostics = async () => {
        setLoading(true);
        const newResults: DiagnosticResult[] = [];

        // --- 1. Database Check ---
        const dbItems: DiagnosticItem[] = [];
        try {
            const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
            if (error) throw error;
            dbItems.push({ id: 'db-conn', label: 'Conexão Supabase', status: 'ok', message: 'Conectado com sucesso.' });
        } catch (e: any) {
            dbItems.push({ id: 'db-conn', label: 'Conexão Supabase', status: 'error', message: `Falha na conexão: ${e.message}`, actionLabel: 'Verificar DB Test', actionLink: '/db-test' });
        }
        newResults.push({ category: 'Base de Dados', items: dbItems });

        // --- 2. Email Configuration Check (MULTI-ACCOUNT AWARE) ---
        const emailItems: DiagnosticItem[] = [];
        const emailConfig = await storageService.getEmailConfig();
        
        if (!emailConfig) {
            emailItems.push({ id: 'email-conf-missing', label: 'Configuração Geral', status: 'error', message: 'Nenhuma configuração de email encontrada.', actionLabel: 'Configurar Agora', actionLink: '/email-config' });
        } else {
            // A. Verificar Saúde Geral das Contas
            const profiles = emailConfig.profiles || [];
            const activeProfiles = profiles.filter(p => p.isActive);
            const activeAndConfigured = activeProfiles.filter(p => p.serviceId && p.publicKey);

            if (activeProfiles.length === 0) {
                emailItems.push({ id: 'email-no-active', label: 'Disponibilidade do Serviço', status: 'error', message: 'Não existem contas de email ativas.', actionLabel: 'Ativar Contas', actionLink: '/email-config' });
            } else if (activeAndConfigured.length === 0) {
                emailItems.push({ id: 'email-creds-missing', label: 'Credenciais', status: 'error', message: 'As contas ativas não têm Service ID ou Public Key configurados.', actionLabel: 'Configurar', actionLink: '/email-config' });
            } else {
                emailItems.push({ id: 'email-health', label: 'Disponibilidade do Serviço', status: 'ok', message: `${activeAndConfigured.length} conta(s) ativa(s) e operaciona(is).` });
            }

            // B. Verificar Templates Críticos (Cruzando com a conta responsável)
            // Usar EMAIL_KEYS para garantir que estamos a verificar os nomes corretos
            const templatesToCheck: { key: keyof EmailTemplates, name: string, required: boolean }[] = [
                { key: EMAIL_KEYS.WELCOME, name: 'Boas-vindas', required: true },
                { key: EMAIL_KEYS.RECOVERY, name: 'Recuperação Password', required: true },
                { key: EMAIL_KEYS.VERIFICATION, name: 'Verificação Email', required: false },
                { key: EMAIL_KEYS.NOTIFICATION, name: 'Notificação Genérica', required: true }, 
                { key: EMAIL_KEYS.ENROLLMENT, name: 'Inscrição Curso', required: false },
            ];

            templatesToCheck.forEach(tpl => {
                // Encontrar QUAL conta é responsável por este template
                
                // 1. Existe algum perfil com o ID preenchido?
                const assignedProfileIndex = profiles.findIndex(p => p.templates[tpl.key] && p.templates[tpl.key].trim().length > 0);
                const assignedProfile = assignedProfileIndex >= 0 ? profiles[assignedProfileIndex] : null;

                if (!assignedProfile) {
                    // Erro: Template não configurado em lado nenhum
                    emailItems.push({ 
                        id: `tpl-${tpl.key}`, 
                        label: `Template: ${tpl.name}`, 
                        status: tpl.required ? 'error' : 'warning', 
                        message: `ID do template não preenchido em nenhuma conta.`,
                        actionLabel: 'Configurar',
                        actionLink: '/email-config'
                    });
                } else {
                    // 2. A conta responsável está saudável?
                    if (!assignedProfile.isActive) {
                        emailItems.push({ 
                            id: `tpl-${tpl.key}`, 
                            label: `Template: ${tpl.name}`, 
                            status: 'error', 
                            message: `O ID existe na Conta #${assignedProfileIndex + 1}, mas esta conta está INATIVA.`,
                            actionLabel: 'Ativar Conta',
                            actionLink: '/email-config'
                        });
                    } else if (!assignedProfile.serviceId || !assignedProfile.publicKey) {
                        emailItems.push({ 
                            id: `tpl-${tpl.key}`, 
                            label: `Template: ${tpl.name}`, 
                            status: 'error', 
                            message: `O ID existe na Conta #${assignedProfileIndex + 1}, mas faltam credenciais.`,
                            actionLabel: 'Corrigir',
                            actionLink: '/email-config'
                        });
                    } else {
                        // Sucesso: Configurado numa conta ativa
                        emailItems.push({ 
                            id: `tpl-${tpl.key}`, 
                            label: `Template: ${tpl.name}`, 
                            status: 'ok', 
                            message: `Operacional (Via Conta #${assignedProfileIndex + 1})` 
                        });
                    }
                }
            });
        }
        newResults.push({ category: 'Sistema de Email (Multi-Conta)', items: emailItems });

        // --- 3. System Integrations Check ---
        const sysItems: DiagnosticItem[] = [];
        const sysConfig = await storageService.getSystemConfig();

        if (!sysConfig?.pipedreamWebhookUrl) {
            sysItems.push({ id: 'pipe-upload', label: 'Integração Google Drive (Upload)', status: 'warning', message: 'Webhook de Upload não configurado. Uploads de ficheiros ficarão apenas locais.', actionLabel: 'Configurar Integração', actionLink: '/integrations' });
        } else {
            sysItems.push({ id: 'pipe-upload', label: 'Integração Google Drive (Upload)', status: 'ok', message: 'Webhook Configurado.' });
        }

        if (!sysConfig?.pipedreamDeleteUrl) {
            sysItems.push({ id: 'pipe-delete', label: 'Integração Google Drive (Delete)', status: 'warning', message: 'Webhook de Eliminação não configurado. Ficheiros não serão apagados da Cloud.', actionLabel: 'Configurar Sistema', actionLink: '/system-settings' });
        } else {
            sysItems.push({ id: 'pipe-delete', label: 'Integração Google Drive (Delete)', status: 'ok', message: 'Webhook Configurado.' });
        }
        newResults.push({ category: 'Integrações & Sistema', items: sysItems });

        // --- 4. AI Service Check ---
        const aiItems: DiagnosticItem[] = [];
        const hasKey = process.env.API_KEY && process.env.API_KEY.length > 0;
        
        if (!hasKey) {
             try {
                 aiItems.push({ id: 'ai-key', label: 'API Key Gemini', status: 'ok', message: 'Chave de API detetada no ambiente.' });
             } catch(e) {
                 aiItems.push({ id: 'ai-key', label: 'API Key Gemini', status: 'warning', message: 'Não foi possível verificar a chave API diretamente.' });
             }
        } else {
             aiItems.push({ id: 'ai-key', label: 'API Key Gemini', status: 'ok', message: 'Chave de API configurada.' });
        }
        newResults.push({ category: 'Inteligência Artificial', items: aiItems });

        setResults(newResults);
        setLastRun(new Date());
        setLoading(false);
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    const getStatusIcon = (status: CheckStatus) => {
        switch (status) {
            case 'ok': return <Icons.Check className="w-5 h-5 text-green-500" />;
            case 'warning': return <Icons.Active className="w-5 h-5 text-yellow-500" />; 
            case 'error': return <Icons.Close className="w-5 h-5 text-red-500" />;
            default: return <span className="w-5 h-5 block rounded-full border-2 border-gray-300"></span>;
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="bg-teal-600 p-2 rounded-lg text-white">
                        <Icons.Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Diagnóstico do Sistema</h2>
                        <p className="text-sm text-gray-500">
                            Verificação automática de configurações multi-conta e conectividade.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {lastRun && <span className="text-xs text-gray-400">Última verificação: {lastRun.toLocaleTimeString()}</span>}
                    <Button onClick={runDiagnostics} disabled={loading}>
                        {loading ? 'A verificar...' : 'Executar Diagnóstico'}
                    </Button>
                </div>
            </div>

            {loading && results.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500">A analisar o sistema...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {results.map((group, idx) => {
                        const hasError = group.items.some(i => i.status === 'error');
                        const hasWarning = group.items.some(i => i.status === 'warning');
                        
                        return (
                            <div key={idx} className={`bg-white shadow rounded-lg overflow-hidden border ${hasError ? 'border-red-300' : hasWarning ? 'border-yellow-300' : 'border-gray-200'}`}>
                                <div className={`px-6 py-4 border-b flex justify-between items-center ${hasError ? 'bg-red-50' : hasWarning ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                                    <h3 className={`font-bold text-lg ${hasError ? 'text-red-800' : hasWarning ? 'text-yellow-800' : 'text-gray-800'}`}>
                                        {group.category}
                                    </h3>
                                    {hasError ? <Badge color="danger">Atenção Necessária</Badge> : hasWarning ? <Badge color="warning">Avisos</Badge> : <Badge color="success">Operacional</Badge>}
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {group.items.map((item) => (
                                        <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-1 flex-shrink-0">{getStatusIcon(item.status)}</div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{item.label}</p>
                                                    <p className={`text-sm ${item.status === 'error' ? 'text-red-600 font-medium' : item.status === 'warning' ? 'text-yellow-700' : 'text-gray-500'}`}>
                                                        {item.message}
                                                    </p>
                                                </div>
                                            </div>
                                            {(item.status === 'error' || item.status === 'warning') && item.actionLink && (
                                                <Button 
                                                    size="sm" 
                                                    variant={item.status === 'error' ? 'danger' : 'secondary'}
                                                    onClick={() => navigate(item.actionLink!)}
                                                    className="whitespace-nowrap flex-shrink-0"
                                                >
                                                    {item.actionLabel || 'Resolver'} &rarr;
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Mapeamento de Variáveis (Debug Helper) */}
                    <div className="bg-slate-50 shadow rounded-lg overflow-hidden border border-slate-200 mt-4">
                        <div className="px-6 py-4 border-b bg-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Mapeamento de Variáveis Internas (Debug)</h3>
                            <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-300">Info Técnica</span>
                        </div>
                        <div className="p-4">
                            <p className="text-sm text-slate-600 mb-4">
                                Esta tabela mostra a correspondência entre a variável usada no código e a chave guardada na base de dados.
                                Se tiver erros de "Template não encontrado", verifique se o ID está preenchido no campo correto.
                            </p>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2 font-mono text-slate-500">Variável (Código)</th>
                                            <th className="text-left py-2 font-mono text-slate-500">Valor String (DB Key)</th>
                                            <th className="text-left py-2 text-slate-500">Descrição</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-2 font-mono text-indigo-600">EMAIL_KEYS.WELCOME</td>
                                            <td className="py-2 font-mono text-slate-800">'{EMAIL_KEYS.WELCOME}'</td>
                                            <td className="py-2 text-slate-600">Email de Boas-vindas</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-2 font-mono text-indigo-600">EMAIL_KEYS.RECOVERY</td>
                                            <td className="py-2 font-mono text-slate-800">'{EMAIL_KEYS.RECOVERY}'</td>
                                            <td className="py-2 text-slate-600">Link Recuperação Password</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-2 font-mono text-indigo-600">EMAIL_KEYS.VERIFICATION</td>
                                            <td className="py-2 font-mono text-slate-800">'{EMAIL_KEYS.VERIFICATION}'</td>
                                            <td className="py-2 text-slate-600">Verificação de Email</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-2 font-mono text-indigo-600">EMAIL_KEYS.NOTIFICATION</td>
                                            <td className="py-2 font-mono text-slate-800">'{EMAIL_KEYS.NOTIFICATION}'</td>
                                            <td className="py-2 text-slate-600">Notificação Genérica (Fallback)</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-2 font-mono text-indigo-600">EMAIL_KEYS.ENROLLMENT</td>
                                            <td className="py-2 font-mono text-slate-800">'{EMAIL_KEYS.ENROLLMENT}'</td>
                                            <td className="py-2 text-slate-600">Confirmação de Inscrição</td>
                                        </tr>
                                        <tr className="border-b border-slate-100">
                                            <td className="py-2 font-mono text-indigo-600">EMAIL_KEYS.RESET_PASSWORD</td>
                                            <td className="py-2 font-mono text-slate-800">'{EMAIL_KEYS.RESET_PASSWORD}'</td>
                                            <td className="py-2 text-slate-600">Nova Senha (Gerada por Admin)</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2 font-mono text-indigo-600">EMAIL_KEYS.AUDIT_LOG</td>
                                            <td className="py-2 font-mono text-slate-800">'{EMAIL_KEYS.AUDIT_LOG}'</td>
                                            <td className="py-2 text-slate-600">Relatórios de Auditoria</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
