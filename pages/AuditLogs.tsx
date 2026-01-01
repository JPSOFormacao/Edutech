import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { FileDeletionLog } from '../types';
import { Icons } from '../components/Icons';
import { Badge } from '../components/UI';

export default function AuditLogs() {
  const [logs, setLogs] = useState<FileDeletionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    const data = await storageService.getDeletionLogs();
    // Ordenar do mais recente para o mais antigo
    const sorted = data.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    setLogs(sorted);
    setLoading(false);
  };

  const getPendingCount = () => logs.filter(l => !l.emailSent).length;

  if (loading) return <div className="p-10 text-center">A carregar registos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.Audit className="w-6 h-6 text-indigo-600" />
            Registos de Auditoria
        </h2>
        <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Contagem Atual (Pendentes de Email): <strong>{getPendingCount()}/10</strong>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                  <Icons.Check className="w-12 h-12 mx-auto text-green-300 mb-2" />
                  <p>Não existem registos de ficheiros eliminados.</p>
              </div>
          ) : (
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ficheiro Eliminado</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eliminado Por</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado do Reporte</th>
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {logs.map((log) => (
                              <tr key={log.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="flex items-center">
                                          <Icons.FileText className="w-4 h-4 text-gray-400 mr-2" />
                                          <span className="text-sm font-medium text-gray-900">{log.fileName}</span>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {log.deletedByName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {new Date(log.deletedAt).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                      {log.emailSent ? (
                                          <Badge color="success">Reportado</Badge>
                                      ) : (
                                          <Badge color="warning">Pendente</Badge>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
      </div>
      
      <div className="text-xs text-gray-400 mt-2">
          * Um relatório é enviado automaticamente para o email do sistema sempre que 10 ficheiros são eliminados (Estado "Pendente").
      </div>
    </div>
  );
}