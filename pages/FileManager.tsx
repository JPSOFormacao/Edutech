import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { UploadedFile, UserRole, User } from '../types';
import { useAuth } from '../App';
import { Button, Badge } from '../components/UI';
import { Icons } from '../components/Icons';

export default function FileManager() {
  const { user, systemConfig } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [user]);

  const loadFiles = async () => {
    setLoading(true);
    const allFiles = await storageService.getFiles();
    
    if (user?.role === UserRole.ADMIN) {
        // Admin vê tudo
        setFiles(allFiles);
    } else {
        // Outros cargos veem apenas os seus
        setFiles(allFiles.filter(f => f.uploadedBy === user?.id));
    }
    setLoading(false);
  };

  // Lógica Central de Eliminação (Reutilizável)
  const processFileDeletion = async (file: UploadedFile, currentUser: User): Promise<void> => {
      const hasDriveId = !!file.driveFileId;
      const pipedreamUrl = systemConfig?.pipedreamDeleteUrl;

      // 1. Apagar do Google Drive (se configurado)
      if (hasDriveId && pipedreamUrl) {
          const deleteUrl = new URL(pipedreamUrl);
          deleteUrl.searchParams.append('fileId', file.driveFileId!);

          const response = await fetch(deleteUrl.toString(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  fileId: file.driveFileId,
                  action: 'delete'
              })
          });

          if (!response.ok) {
              throw new Error(`Serviço Drive: Erro ${response.status} - ${response.statusText}`);
          }
      }

      // 2. Apagar da Base de Dados Local
      await storageService.deleteFile(file.id);

      // 3. Registar Log e Verificar Email de Segurança
      const pendingLogs = await storageService.addDeletionLog(file, currentUser);
      
      if (pendingLogs.length >= 10) {
          console.log("Limite de 10 ficheiros eliminados atingido. A enviar relatório...");
          const emailSent = await emailService.sendDeletionBatchEmail(pendingLogs);
          
          if (emailSent) {
              const logIds = pendingLogs.map(l => l.id);
              await storageService.markLogsAsSent(logIds);
              console.log("Relatório enviado e contagem reiniciada.");
          }
      }
  };

  const handleDeleteSingle = async (file: UploadedFile) => {
      if(!user) return;
      const hasDriveId = !!file.driveFileId;
      const pipedreamUrl = systemConfig?.pipedreamDeleteUrl;
      
      const confirmMsg = hasDriveId && pipedreamUrl
        ? 'Tem a certeza? Isto irá tentar apagar o ficheiro do Google Drive e remover o registo da aplicação.'
        : 'Tem a certeza que deseja remover o registo?';

      if (confirm(confirmMsg)) {
          setDeleting(file.id);
          try {
              await processFileDeletion(file, user);
              loadFiles();
              // Se estava selecionado, remover da seleção
              setSelectedIds(prev => prev.filter(id => id !== file.id));
          } catch (e: any) {
              console.error(e);
              // Fallback para erro no Drive
              if (confirm(`ERRO NO DRIVE: ${e.message}\n\nDeseja forçar a eliminação do registo local apenas?`)) {
                   await storageService.deleteFile(file.id);
                   await storageService.addDeletionLog(file, user); 
                   loadFiles();
              }
          } finally {
              setDeleting(null);
          }
      }
  };

  const handleBulkDelete = async () => {
      if (!user || selectedIds.length === 0) return;

      if (confirm(`Tem a certeza que deseja apagar os ${selectedIds.length} ficheiros selecionados?`)) {
          setIsBulkDeleting(true);
          const filesToDelete = files.filter(f => selectedIds.includes(f.id));
          let successCount = 0;
          let errors = [];

          for (const file of filesToDelete) {
              try {
                  await processFileDeletion(file, user);
                  successCount++;
              } catch (e: any) {
                  errors.push(`${file.fileName}: ${e.message}`);
              }
          }

          if (errors.length > 0) {
              alert(`Eliminação concluída com avisos.\nSucesso: ${successCount}\nErros:\n${errors.join('\n')}`);
          } else {
              // Feedback subtil se tudo correu bem
              // alert(`${successCount} ficheiros eliminados com sucesso.`);
          }

          setIsBulkDeleting(false);
          setSelectedIds([]);
          loadFiles();
      }
  };

  // Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(files.map(f => f.id));
      } else {
          setSelectedIds([]);
      }
  };

  const handleSelectOne = (id: string) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(curr => curr !== id));
      } else {
          setSelectedIds(prev => [...prev, id]);
      }
  };

  const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) return <div className="p-10 text-center">A carregar ficheiros...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.Cloud className="w-6 h-6 text-indigo-600" />
            Gestão de Ficheiros
        </h2>
        {user?.role === UserRole.ADMIN && (
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Modo Admin
            </span>
        )}
      </div>

      {!systemConfig?.pipedreamDeleteUrl && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm mb-4 flex items-center gap-2">
              <Icons.Settings className="w-4 h-4" />
              <span><strong>Atenção:</strong> O URL de Delete não está configurado em "Config. Sistema". Os ficheiros apagados aqui continuarão a existir no Google Drive.</span>
          </div>
      )}

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex justify-between items-center animate-fade-in">
              <span className="text-sm font-medium text-indigo-800 ml-2">
                  {selectedIds.length} ficheiro(s) selecionado(s)
              </span>
              <Button 
                variant="danger" 
                size="sm" 
                onClick={handleBulkDelete} 
                disabled={isBulkDeleting}
                icon={Icons.Delete}
              >
                  {isBulkDeleting ? 'A apagar...' : 'Apagar Selecionados'}
              </Button>
          </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {files.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                  <Icons.FileText className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                  <p>Não foram encontrados registos de ficheiros.</p>
              </div>
          ) : (
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 w-10">
                              <input 
                                type="checkbox" 
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                checked={files.length > 0 && selectedIds.length === files.length}
                                onChange={handleSelectAll}
                              />
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Drive</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contexto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enviado por</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {files.map((file) => (
                          <tr key={file.id} className={selectedIds.includes(file.id) ? 'bg-indigo-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <input 
                                    type="checkbox" 
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                    checked={selectedIds.includes(file.id)}
                                    onChange={() => handleSelectOne(file.id)}
                                  />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                      <Icons.FileText className="w-5 h-5 text-gray-400 mr-2" />
                                      {file.webViewLink ? (
                                          <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-900 truncate max-w-xs block" title={file.fileName}>
                                              {file.fileName}
                                          </a>
                                      ) : (
                                          <span className="text-sm font-medium text-gray-900 truncate max-w-xs" title={file.fileName}>{file.fileName}</span>
                                      )}
                                  </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  {file.driveFileId ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title={`ID: ${file.driveFileId}`}>
                                          <Icons.Cloud className="w-3 h-3 mr-1" /> Sincronizado
                                      </span>
                                  ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                          Local
                                      </span>
                                  )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge color={file.context === 'material' ? 'info' : 'success'}>
                                      {file.context === 'material' ? 'Material Didático' : 'Carregado'}
                                  </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatSize(file.size)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {file.uploaderName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(file.uploadDate).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button 
                                    onClick={() => handleDeleteSingle(file)} 
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1 ml-auto disabled:opacity-50"
                                    disabled={deleting === file.id || isBulkDeleting}
                                    title="Apagar"
                                  >
                                      {deleting === file.id ? (
                                          "..."
                                      ) : (
                                          <Icons.Delete className="w-4 h-4" /> 
                                      )}
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>
    </div>
  );
}