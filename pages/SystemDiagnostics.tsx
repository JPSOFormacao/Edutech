
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { supabase } from '../services/supabaseClient';
import { Button, Badge } from '../components/UI';
import { Icons } from '../components/Icons';
import { EmailTemplates, EmailConfigProfile, EMAIL_KEYS, EMAIL_KEY_LABELS, EmailConfig } from '../types';

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
    const [emailConfig, setEmailConfig] = useState<EmailConfig | null>(null);

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
        const config = await storageService.getEmailConfig();
        setEmailConfig(config); // Save for the detailed table
        
        if (!config) {
            emailItems.push({ id: 'email-conf-missing', label: 'Configuração Geral', status: 'error', message: 'Nenhuma configuração de email encontrada.', actionLabel: 'Configurar Agora', actionLink: '/email-config' });
        } else {
            // A. Verificar Saúde Geral das Contas
            const profiles = config.profiles || [];
            const activeProfiles = profiles.filter(p => p.isActive);
            const activeAndConfigured = activeProfiles.filter(p => p.serviceId && p.publicKey);

            if (activeProfiles.length === 0) {
                emailItems.push({ id: 'email-no-active', label: 'Disponibilidade do Serviço', status: 'error', message: 'Não existem contas de email ativas.', actionLabel: 'Ativar Contas', actionLink: '/email-config' });
            } else if (activeAndConfigured.length === 0) {
                emailItems.push({ id: 'email-creds-missing', label: 'Credenciais', status: 'error', message: 'As contas ativas não têm Service ID ou Public Key configurados.', actionLabel: 'Configurar', actionLink: '/email-config' });
            } else {
                emailItems.push({ id: 'email-health', label: 'Disponibilidade do Serviço', status: 'ok', message: `${activeAndConfigured.length} conta(s) ativa(s) e operaciona(is).` });
            }

            // B. Verificar Templates Críticos
            Object.values(EMAIL_KEYS).forEach(key => {
                const templateKey = key as keyof EmailTemplates;
                const label = EMAIL_KEY_LABELS[templateKey];
                
                // Encontrar QUAL conta é responsável por este template
                const assignedProfileIndex = profiles.findIndex(p => p.templates[templateKey] && p.templates[templateKey].trim().length > 0);
                const assignedProfile = assignedProfileIndex >= 0 ? profiles[assignedProfileIndex] : null;

                if (!assignedProfile) {
                    // Aviso se for opcional, Erro se for crítico (ex: Welcome, Recovery)
                    const isCritical = ([EMAIL_KEYS.WELCOME, EMAIL_KEYS.RECOVERY, EMAIL_KEYS.NOTIFICATION] as string[]).includes(templateKey);
                    emailItems.push({ 
                        id: `tpl-${templateKey}`, 
                        label: `Template: ${label}`, 
                        status: isCritical ? 'error' : 'warning', 
                        message: `ID não configurado em nenhuma conta.`,
                        actionLabel: 'Configurar',
                        actionLink: '/email-config'
                    });
                } else {
                    if (!assignedProfile.isActive) {
                        emailItems.push({ 
                            id: `tpl-${templateKey}`, 
                            label: `Template: ${label}`, 
                            status: 'error', 
                            message: `Encontrado na Conta #${assignedProfileIndex + 1}, mas a conta está INATIVA.`,
                            actionLabel: 'Ativar Conta',
                            actionLink: '/email-config'
                        });
                    } else if (!assignedProfile.serviceId || !assignedProfile.publicKey) {
                        emailItems.push({ 
                            id: `tpl-${templateKey}`, 
                            label: `Template: ${label}`, 
                            status: 'error', 
                            message: `Encontrado na Conta #${assignedProfileIndex + 1}, mas faltam credenciais.`,
                            actionLabel: 'Corrigir',
                            actionLink: '/email-config'
                        });
                    } else {
                        emailItems.push({ 
                            id: `tpl-${templateKey}`, 
                            label: `Template: ${label}`, 
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

        setResults(newResults);
        setLastRun(new Date());
        setLoading(false);
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    // Helper para tabela de variáveis
    const getTemplateStatusRow = (variableCode: string, dbKey: keyof EmailTemplates) => {
        if (!emailConfig) return null;
        
        const profiles = emailConfig.profiles || [];
        const assignedIdx = profiles.findIndex(p => p.templates[dbKey] && p.templates[dbKey].trim().length > 0);
        
        let status = <span className="text-gray-400">Não Definido</span>;
        let accountInfo = <span className="text-gray-400">-</span>;
        let value = <span className="text-gray-400 italic">vazio</span>;

        if (assignedIdx >= 0) {
            const p = profiles[assignedIdx];
            const val = p.templates[dbKey];
            value = <span className="font-mono text-gray-800">{val.substring(0, 8)}...</span>;
            accountInfo = <span className="font-bold">Conta #{assignedIdx + 1}</span>;
            
            if (p.isActive) {
                status = <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">ATIVA</span>;
            } else {
                status = <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">INATIVA</span>;
            }
        }

        return (
            <tr key={dbKey} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-4 font-mono text-indigo-600 text-xs sm:text-sm">{variableCode}</td>
                <td className="py-2 px-4 font-mono text-slate-500 text-xs sm:text-sm">{dbKey}</td>
                <td className="py-2 px-4 text-sm">{EMAIL_KEY_LABELS[dbKey]}</td>
                <td className="py-2 px-4 text-sm">{value}</td>
                <td className="py-2 px-4 text-sm">{accountInfo}</td>
                <td className="py-2 px-4">{status}</td>
            </tr>
        );
    };

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
                            Verificação de configurações multi-conta e mapeamento de variáveis.
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

                    {/* Mapeamento de Variáveis (Live Table) */}
                    <div className="bg-slate-50 shadow rounded-lg overflow-hidden border border-slate-200 mt-4">
                        <div className="px-6 py-4 border-b bg-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Estado das Variáveis de Email</h3>
                            <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-300">Live Status</span>
                        </div>
                        <div className="p-0">
                            <div className="px-6 py-4 text-sm text-slate-600 border-b bg-white">
                                <p className="mb-2"><strong>Como ler esta tabela:</strong></p>
                                <ul className="list-disc pl-5 space-y-1">
                                    <li><strong>Variável (Código):</strong> O nome usado no código da aplicação.</li>
                                    <li><strong>DB Key:</strong> O nome da chave guardada na base de dados.</li>
                                    <li><strong>Valor Encontrado:</strong> Indica se existe um ID de template preenchido.</li>
                                    <li><strong>Conta & Estado:</strong> Mostra qual conta tem o template e se ela está ATIVA. Se estiver <span className="text-red-600 font-bold">INATIVA</span>, o envio falhará mesmo que o ID exista.</li>
                                </ul>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left">
                                    <thead className="bg-slate-100 text-slate-500 text-xs uppercase font-medium">
                                        <tr>
                                            <th className="py-3 px-4">Variável (Código)</th>
                                            <th className="py-3 px-4">DB Key</th>
                                            <th className="py-3 px-4">Descrição</th>
                                            <th className="py-3 px-4">Valor Encontrado</th>
                                            <th className="py-3 px-4">Conta</th>
                                            <th className="py-3 px-4">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white">
                                        {getTemplateStatusRow('EMAIL_KEYS.WELCOME', EMAIL_KEYS.WELCOME)}
                                        {getTemplateStatusRow('EMAIL_KEYS.RECOVERY', EMAIL_KEYS.RECOVERY)}
                                        {getTemplateStatusRow('EMAIL_KEYS.VERIFICATION', EMAIL_KEYS.VERIFICATION)}
                                        {getTemplateStatusRow('EMAIL_KEYS.NOTIFICATION', EMAIL_KEYS.NOTIFICATION)}
                                        {getTemplateStatusRow('EMAIL_KEYS.ENROLLMENT', EMAIL_KEYS.ENROLLMENT)}
                                        {getTemplateStatusRow('EMAIL_KEYS.RESET_PASSWORD', EMAIL_KEYS.RESET_PASSWORD)}
                                        {getTemplateStatusRow('EMAIL_KEYS.AUDIT_LOG', EMAIL_KEYS.AUDIT_LOG)}
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
