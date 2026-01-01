import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { UploadedFile, UserRole } from '../types';
import { useAuth } from '../App';
import { Button, Badge } from '../components/UI';
import { Icons } from '../components/Icons';

export default function FileManager() {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (id: string) => {
      if (confirm('Tem a certeza que deseja remover o registo deste ficheiro? Nota: O ficheiro não será apagado do Google Drive, apenas da lista da aplicação.')) {
          await storageService.deleteFile(id);
          loadFiles();
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
                                      <span className="text-sm font-medium text-gray-900 truncate max-w-xs" title={file.fileName}>{file.fileName}</span>
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
                                    onClick={() => handleDelete(file.id)} 
                                    className="text-red-600 hover:text-red-900 flex items-center gap-1 ml-auto"
                                    title="Remover Registo"
                                  >
                                      <Icons.Delete className="w-4 h-4" /> Remover
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          )}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
          <strong>Nota Importante:</strong> Ao remover um ficheiro nesta lista, apenas o registo na aplicação é apagado. O ficheiro continuará a existir no Google Drive até ser apagado manualmente na nuvem.
      </div>
    </div>
  );
}
