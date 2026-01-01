import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { UploadedFile, UserRole } from '../types';
import { useAuth } from '../App';
import { Button, Badge } from '../components/UI';
import { Icons } from '../components/Icons';

export default function FileManager() {
  const { user, systemConfig } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const handleDelete = async (file: UploadedFile) => {
      const confirmMsg = file.driveFileId && systemConfig?.pipedreamDeleteUrl
        ? 'Tem a certeza? Isto irá apagar o ficheiro do Google Drive e da aplicação.'
        : 'Tem a certeza que deseja remover o registo? (O ficheiro pode manter-se no Drive se não houver ID associado)';

      if (confirm(confirmMsg)) {
          setDeleting(file.id);
          try {
              // Tentar apagar no Drive via Pipedream se configurado
              if (file.driveFileId && systemConfig?.pipedreamDeleteUrl) {
                  await fetch(systemConfig.pipedreamDeleteUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ fileId: file.driveFileId })
                  });
              }
              
              // Apagar Registo Local
              await storageService.deleteFile(file.id);
              loadFiles();
          } catch (e) {
              alert("Erro ao apagar ficheiro.");
          } finally {
              setDeleting(null);
          }
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
                Modo Administrador: A ver todos os ficheiros
            </span>
        )}
      </div>

      {!systemConfig?.pipedreamDeleteUrl && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm mb-4">
              <strong>Atenção:</strong> O URL de Delete não está configurado. Apagar ficheiros aqui removerá apenas o registo na aplicação, mantendo o ficheiro no Google Drive.
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
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contexto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tamanho</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enviado por</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {files.map((file) => (
                          <tr key={file.id}>
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
                                  <Badge color={file.context === 'material' ? 'info' : 'success'}>
                                      {file.context === 'material' ? 'Material Didático' : 'Integração'}
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
                                    onClick={() => handleDelete(file)} 
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1 ml-auto disabled:opacity-50"
                                    disabled={deleting === file.id}
                                    title={file.driveFileId ? "Remover do Drive e da App" : "Remover registo da App"}
                                  >
                                      {deleting === file.id ? (
                                          "A remover..."
                                      ) : (
                                          <>
                                            <Icons.Delete className="w-4 h-4" /> 
                                            {file.driveFileId && systemConfig?.pipedreamDeleteUrl ? 'Apagar (Drive)' : 'Remover'}
                                          </>
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
