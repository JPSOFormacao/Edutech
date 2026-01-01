import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Icons } from '../components/Icons';
import { Button } from '../components/UI';
import { storageService } from '../services/storageService';
import { UploadedFile } from '../types';

export default function IntegrationsPage() {
    const { systemConfig, refreshSystemConfig, user } = useAuth();
    const [webhookUrl, setWebhookUrl] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

    // Carregar configuração global ou local
    useEffect(() => {
        const load = async () => {
            if (systemConfig?.pipedreamWebhookUrl) {
                setWebhookUrl(systemConfig.pipedreamWebhookUrl);
            } else {
                // Fallback para local storage caso o admin não tenha configurado no sistema
                const local = localStorage.getItem('pipedream_webhook_local');
                if (local) setWebhookUrl(local);
            }
        };
        load();
    }, [systemConfig]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setStatus(null);
        }
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus({ type: 'error', msg: 'Selecione um ficheiro.' });
            return;
        }
        if (!webhookUrl) {
            setStatus({ type: 'error', msg: 'URL do Webhook não configurado.' });
            return;
        }

        setUploading(true);
        setStatus({ type: 'info', msg: 'A processar ficheiro...' });

        try {
            // 1. Converter para Base64 para envio seguro via JSON
            const base64Data = await convertToBase64(file);
            
            setStatus({ type: 'info', msg: 'A enviar para o Pipedream...' });

            // 2. Enviar para Webhook
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filename: file.name, // Nome original
                    originalFilename: file.name,
                    mimetype: file.type,
                    size: file.size,
                    fileData: base64Data, // Payload Base64
                    uploadedBy: user?.name || 'EduTech User',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                // Tentar ler a resposta do Pipedream (se configurada corretamente)
                let driveData = { fileId: '', webViewLink: '' };
                try {
                    const jsonRes = await response.json();
                    if(jsonRes && jsonRes.fileId) {
                        driveData.fileId = jsonRes.fileId;
                        driveData.webViewLink = jsonRes.webViewLink;
                    }
                } catch(e) {
                    console.warn("Pipedream não retornou JSON. O ficheiro foi enviado mas o link real pode não estar disponível.");
                }

                // 3. Registar o ficheiro na app
                if (user) {
                    const newFile: UploadedFile = {
                        id: 'file_' + Date.now(),
                        fileName: file.name, 
                        fileType: file.type,
                        size: file.size,
                        uploadedBy: user.id,
                        uploaderName: user.name,
                        uploadDate: new Date().toISOString(),
                        context: 'integration',
                        driveFileId: driveData.fileId, // ID real do Drive
                        webViewLink: driveData.webViewLink // Link real do Drive
                    };
                    await storageService.saveFile(newFile);
                }

                setStatus({ type: 'success', msg: 'Sucesso! Ficheiro enviado para o Drive e registado.' });
                setFile(null); // Reset
                const input = document.getElementById('file-upload') as HTMLInputElement;
                if(input) input.value = '';
            } else {
                setStatus({ type: 'error', msg: `Erro no envio: ${response.statusText}` });
            }

        } catch (error: any) {
            console.error("Upload Error:", error);
            setStatus({ type: 'error', msg: 'Falha na conexão: ' + error.message });
        } finally {
            setUploading(false);
        }
    };

    const saveLocalWebhook = (val: string) => {
        setWebhookUrl(val);
        localStorage.setItem('pipedream_webhook_local', val);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg text-white">
                    <Icons.Cloud className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Integração Google Drive</h2>
                    <p className="text-sm text-gray-500">Envie documentos para a cloud via Pipedream.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="bg-white shadow rounded-lg p-6 space-y-4 md:col-span-1 h-fit">
                    <h3 className="font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
                        <Icons.Settings className="w-4 h-4" /> Configuração
                    </h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pipedream Webhook URL</label>
                        <input 
                            type="text" 
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                            placeholder="https://eo..."
                            value={webhookUrl}
                            onChange={(e) => saveLocalWebhook(e.target.value)}
                            disabled={!!systemConfig?.pipedreamWebhookUrl} // Disable if set globally via System Settings
                        />
                        {systemConfig?.pipedreamWebhookUrl ? (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <Icons.Check className="w-3 h-3" /> Gerido pelo Administrador
                            </p>
                        ) : (
                            <p className="text-xs text-gray-500 mt-1">
                                Configure aqui ou em <b>Config. Sistema</b> para uso global.
                            </p>
                        )}
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded text-xs text-blue-800 border border-blue-100">
                        <p className="font-bold mb-1">Como funciona?</p>
                        <p>1. Crie um Workflow no Pipedream.</p>
                        <p>2. Adicione um trigger "HTTP / Webhook".</p>
                        <p>3. Copie o URL gerado para o campo acima.</p>
                        <p>4. No Pipedream, adicione um passo "Return HTTP Response" com o JSON <code>{`{"fileId": "...", "webViewLink": "..."}`}</code> para obter o link real.</p>
                    </div>
                </div>

                {/* Upload Panel */}
                <div className="bg-white shadow rounded-lg p-6 md:col-span-2 flex flex-col items-center justify-center min-h-[300px]">
                    <div className="w-full max-w-md space-y-6 text-center">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-300">
                            {file ? (
                                <Icons.FileText className="w-10 h-10 text-indigo-500" />
                            ) : (
                                <Icons.Upload className="w-10 h-10 text-gray-400" />
                            )}
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {file ? `Ficheiro Selecionado: ${file.name}` : "Selecione um documento para enviar"}
                            </label>
                            
                            <div className="flex justify-center">
                                <label className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                                    <span>Escolher Ficheiro</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                                </label>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF, DOCX, JPG, PNG até 10MB"}
                            </p>
                        </div>

                        {status && (
                            <div className={`p-3 rounded text-sm ${
                                status.type === 'success' ? 'bg-green-50 text-green-700' :
                                status.type === 'error' ? 'bg-red-50 text-red-700' :
                                'bg-blue-50 text-blue-700'
                            }`}>
                                {status.msg}
                            </div>
                        )}

                        <Button 
                            onClick={handleUpload} 
                            disabled={!file || !webhookUrl || uploading}
                            className="w-full py-3"
                        >
                            {uploading ? (
                                <>
                                    <span className="animate-spin mr-2">⟳</span> A Enviar...
                                </>
                            ) : (
                                <>
                                    <Icons.Cloud className="w-4 h-4 mr-2" /> Enviar para Google Drive
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}