import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Material, MaterialType, Course, SystemConfig, UploadedFile } from '../types';
import { useAuth } from '../App';
import { Button, Input } from '../components/UI';
import { Icons } from '../components/Icons';

export default function MaterialEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { systemConfig, refreshSystemConfig, user } = useAuth();
    
    const [material, setMaterial] = useState<Partial<Material>>({
        title: '',
        type: MaterialType.RECURSO,
        courseId: '',
        linkOrContent: '',
        createdAt: new Date().toISOString()
    });

    const [courses, setCourses] = useState<Course[]>([]);
    const [availableTypes, setAvailableTypes] = useState<string[]>(Object.values(MaterialType));
    
    // Custom Type State
    const [isCreatingType, setIsCreatingType] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');

    // Upload State
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        const [allCourses, allMaterials, config] = await Promise.all([
            storageService.getCourses(),
            storageService.getMaterials(),
            storageService.getSystemConfig()
        ]);
        
        setCourses(allCourses);

        // Load Custom Types from SystemConfig
        if (config?.customMaterialTypes) {
            setAvailableTypes(prev => [...new Set([...prev, ...config.customMaterialTypes!])]);
        }
        
        // Pipedream URL
        if (config?.pipedreamWebhookUrl) {
            setWebhookUrl(config.pipedreamWebhookUrl);
        } else {
            const local = localStorage.getItem('pipedream_webhook_local');
            if (local) setWebhookUrl(local);
        }

        if (id) {
            const found = allMaterials.find(m => m.id === id);
            if (found) {
                setMaterial(found);
            }
        } else {
            // Default course if new
            if (allCourses.length > 0) {
                setMaterial(prev => ({ ...prev, courseId: allCourses[0].id }));
            }
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!material.title || !material.courseId) {
            alert("Preencha o título e selecione um curso.");
            return;
        }

        const toSave: Material = {
            id: material.id || Date.now().toString(),
            courseId: material.courseId,
            title: material.title,
            type: material.type || MaterialType.RECURSO,
            linkOrContent: material.linkOrContent || '',
            createdAt: material.createdAt || new Date().toISOString()
        };

        await storageService.saveMaterials([toSave]);
        navigate('/materials');
    };

    const handleCreateType = async () => {
        if (!newTypeName.trim()) return;
        const normalized = newTypeName.trim().toUpperCase().replace(/\s+/g, '_');
        
        // Update local state
        setAvailableTypes(prev => [...prev, normalized]);
        setMaterial(prev => ({ ...prev, type: normalized }));
        
        // Persist to SystemConfig
        const currentConfig = await storageService.getSystemConfig() || {};
        const currentCustom = currentConfig.customMaterialTypes || [];
        if (!currentCustom.includes(normalized)) {
            await storageService.saveSystemConfig({
                ...currentConfig,
                customMaterialTypes: [...currentCustom, normalized]
            });
            if (refreshSystemConfig) await refreshSystemConfig();
        }

        setIsCreatingType(false);
        setNewTypeName('');
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
        if (!file || !webhookUrl) return;

        setUploading(true);
        setUploadStatus({ type: 'info', msg: 'A enviar...' });

        try {
            const base64Data = await convertToBase64(file);
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    mimetype: file.type,
                    size: file.size,
                    fileData: base64Data,
                    uploadedBy: user?.name || 'Material Editor',
                    timestamp: new Date().toISOString()
                })
            });

            if (response.ok) {
                // Registar ficheiro
                if (user) {
                    const newFile: UploadedFile = {
                        id: 'file_' + Date.now(),
                        fileName: file.name,
                        fileType: file.type,
                        size: file.size,
                        uploadedBy: user.id,
                        uploaderName: user.name,
                        uploadDate: new Date().toISOString(),
                        context: 'material'
                    };
                    await storageService.saveFile(newFile);
                }

                setUploadStatus({ type: 'success', msg: 'Upload OK' });
                // Auto-fill the link field
                const driveLinkText = `[Ficheiro Drive]: ${file.name}`;
                setMaterial(prev => ({ ...prev, linkOrContent: driveLinkText }));
                setFile(null);
            } else {
                setUploadStatus({ type: 'error', msg: 'Erro Upload' });
            }
        } catch (e: any) {
            setUploadStatus({ type: 'error', msg: e.message });
        } finally {
            setUploading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">A carregar editor...</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Icons.Edit className="w-5 h-5 text-indigo-600" />
                    {id ? "Editar Material Didático" : "Novo Material Didático"}
                </h2>
                <Button variant="ghost" onClick={() => navigate('/materials')}>Voltar</Button>
            </div>

            <div className="p-8 space-y-6">
                {/* Title and Course Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <Input 
                            label="Título do Material"
                            value={material.title}
                            onChange={e => setMaterial({...material, title: e.target.value})}
                            placeholder="Ex: Introdução ao Python - Aula 1"
                            className="text-lg"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Curso Associado</label>
                        <select 
                            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-3 px-4 border"
                            value={material.courseId || ''}
                            onChange={e => setMaterial({...material, courseId: e.target.value})}
                        >
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Type Selection Row */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <label className="block text-sm font-bold text-blue-800 mb-2">Tipo de Material</label>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <select 
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 py-2 border"
                                value={material.type || MaterialType.RECURSO}
                                onChange={e => {
                                    if (e.target.value === 'NEW') {
                                        setIsCreatingType(true);
                                    } else {
                                        setMaterial({...material, type: e.target.value});
                                    }
                                }}
                            >
                                {availableTypes.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                                <option value="NEW" className="font-bold text-indigo-600">+ Criar Novo Tipo...</option>
                            </select>
                        </div>
                        {isCreatingType && (
                            <div className="flex-1 flex gap-2 animate-fade-in">
                                <input 
                                    type="text" 
                                    placeholder="Nome do Novo Tipo"
                                    className="block w-full border-gray-300 rounded-md shadow-sm border p-2"
                                    value={newTypeName}
                                    onChange={e => setNewTypeName(e.target.value)}
                                />
                                <Button size="sm" onClick={handleCreateType}>Adicionar</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsCreatingType(false)}>X</Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Area */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Conteúdo ou Link</label>
                    <textarea 
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-4 font-mono h-40 border"
                        value={material.linkOrContent || ''}
                        onChange={e => setMaterial({...material, linkOrContent: e.target.value})}
                        placeholder="Cole aqui o link, o conteúdo de texto, ou utilize o uploader abaixo."
                    />
                </div>

                {/* Upload Section */}
                <div className="border-t pt-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Icons.Cloud className="w-4 h-4 text-gray-500" />
                        Anexar Ficheiro (Google Drive)
                    </h4>
                    
                    {!webhookUrl ? (
                         <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                             Webhook do Pipedream não configurado. Contacte o administrador ou configure em "Integrações".
                         </div>
                    ) : (
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                             <input 
                                type="file" 
                                onChange={e => {
                                    if(e.target.files?.[0]) {
                                        setFile(e.target.files[0]);
                                        setUploadStatus(null);
                                    }
                                }} 
                                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                            />
                            {file && (
                                <Button 
                                    size="sm" 
                                    onClick={handleUpload} 
                                    disabled={uploading}
                                    icon={Icons.Upload}
                                >
                                    {uploading ? 'A enviar...' : 'Enviar para Drive'}
                                </Button>
                            )}
                            {uploadStatus && (
                                <span className={`text-sm font-medium ${uploadStatus.type === 'success' ? 'text-green-600' : uploadStatus.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
                                    {uploadStatus.msg}
                                </span>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                        O ficheiro será enviado para a pasta do Google Drive configurada no Pipedream e o nome do ficheiro será automaticamente inserido no campo de conteúdo acima.
                    </p>
                </div>

                <div className="flex justify-end pt-6 border-t gap-4">
                     <Button variant="ghost" size="lg" onClick={() => navigate('/materials')}>Cancelar</Button>
                     <Button variant="primary" size="lg" onClick={handleSave} icon={Icons.Check}>Guardar Material</Button>
                </div>
            </div>
        </div>
    );
}
