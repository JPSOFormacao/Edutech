
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Button, Badge } from '../components/UI';
import { Icons } from '../components/Icons';

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

interface TestItem {
  id: string;
  name: string;
  tableName: string;
  status: TestStatus;
  message?: string;
}

const AVAILABLE_TABLES = [
    { value: 'users', label: 'Utilizadores (users)' },
    { value: 'roles', label: 'Cargos (roles)' },
    { value: 'classes', label: 'Turmas (classes)' },
    { value: 'courses', label: 'Cursos (courses)' },
    { value: 'materials', label: 'Materiais (materials)' },
    { value: 'pages', label: 'Páginas/CMS (pages)' },
    { value: 'testimonials', label: 'Testemunhos (testimonials)' },
    { value: 'system_config', label: 'Config. Sistema (system_config)' },
    { value: 'email_config', label: 'Config. Email (email_config)' },
    { value: 'deletion_logs', label: 'Logs Eliminação (deletion_logs)' },
    { value: 'uploaded_files', label: 'Ficheiros (uploaded_files)' }
];

export default function DatabaseTest() {
  // --- Estados de Teste de Conexão ---
  const [tests, setTests] = useState<TestItem[]>([
    { id: '1', name: 'Conexão Geral (Health Check)', tableName: '', status: 'idle' },
    { id: '2', name: 'Tabela Roles (Cargos)', tableName: 'roles', status: 'idle' },
    { id: '3', name: 'Tabela Users (Utilizadores)', tableName: 'users', status: 'idle' },
    { id: '4', name: 'Tabela Courses (Cursos)', tableName: 'courses', status: 'idle' },
    { id: '5', name: 'Tabela Classes (Turmas)', tableName: 'classes', status: 'idle' },
    { id: '6', name: 'Tabela Materials (Materiais)', tableName: 'materials', status: 'idle' },
    { id: '7', name: 'Tabela Pages (CMS)', tableName: 'pages', status: 'idle' },
    { id: '8', name: 'Tabela Testimonials', tableName: 'testimonials', status: 'idle' },
    { id: '9', name: 'Tabela System Config', tableName: 'system_config', status: 'idle' },
    { id: '10', name: 'Tabela Email Config', tableName: 'email_config', status: 'idle' },
  ]);

  // --- Estados do Visualizador de Dados ---
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableData, setTableData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // --- Funções de Teste de Conexão ---
  const runTest = async (test: TestItem) => {
    updateTestStatus(test.id, 'loading');
    
    try {
      let error = null;
      let count = null;

      if (test.id === '1') {
          // Teste simples para verificar se a API responde, usando uma tabela leve
          const { error: err } = await supabase.from('roles').select('count', { count: 'exact', head: true });
          error = err;
      } else {
          const { count: c, error: err } = await supabase.from(test.tableName).select('*', { count: 'exact', head: true });
          error = err;
          count = c;
      }

      if (error) throw error;

      updateTestStatus(test.id, 'success', `OK (${count !== null ? count + ' registos' : 'Conectado'})`);
    } catch (e: any) {
      updateTestStatus(test.id, 'error', e.message || 'Erro desconhecido');
    }
  };

  const runAllTests = async () => {
      for (const test of tests) {
          await runTest(test);
      }
  };

  const updateTestStatus = (id: string, status: TestStatus, message?: string) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, status, message } : t));
  };

  // --- Funções do Visualizador de Dados ---
  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newVal = e.target.value;
      setSelectedTable(newVal);
      if (newVal) {
          fetchTableData(newVal);
      } else {
          setTableData([]);
          setDataError(null);
      }
  };

  const fetchTableData = async (tableName: string) => {
      setDataLoading(true);
      setDataError(null);
      setTableData([]);

      try {
          // Limitar a 50 registos para não pesar na interface
          const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .limit(50)
              .order('id', { ascending: false } as any); // Tenta ordenar por ID desc se existir

          if (error) throw error;

          if (data) {
              setTableData(data);
          }
      } catch (e: any) {
          setDataError(e.message || "Erro ao carregar dados.");
          // Se falhar a ordenação por ID (tabelas sem ID), tentar sem ordem
          if (e.message && e.message.includes('order')) {
               try {
                   const { data } = await supabase.from(tableName).select('*').limit(50);
                   if (data) setTableData(data);
                   setDataError(null);
               } catch (retryErr) {
                   console.error(retryErr);
               }
          }
      } finally {
          setDataLoading(false);
      }
  };

  const renderCellValue = (val: any) => {
      if (val === null || val === undefined) return <span className="text-gray-300 text-xs italic">null</span>;
      if (typeof val === 'boolean') return val ? <span className="text-green-600 font-bold">TRUE</span> : <span className="text-red-600 font-bold">FALSE</span>;
      if (typeof val === 'object') return <span className="text-xs font-mono text-blue-600 truncate max-w-[200px] block" title={JSON.stringify(val)}>{JSON.stringify(val)}</span>;
      // Datas
      if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
          return <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(val).toLocaleString()}</span>;
      }
      return <span className="text-sm text-gray-800 truncate max-w-[200px] block" title={String(val)}>{String(val)}</span>;
  };

  return (
    <div className="space-y-8">
       <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Icons.Active className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Diagnóstico de Base de Dados</h2>
            <p className="text-sm text-gray-500">Teste a conectividade e visualize os dados reais no Supabase.</p>
        </div>
      </div>

      {/* --- SECÇÃO 1: TESTES DE CONEXÃO --- */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <div className="mb-6 flex justify-between items-center">
              <div>
                  <h3 className="text-lg font-bold text-gray-900">1. Testes de Conetividade</h3>
                  <p className="text-gray-600 text-sm">
                      Verifica se a aplicação consegue ler as tabelas essenciais.
                  </p>
              </div>
              <Button onClick={runAllTests} variant="secondary">
                  <Icons.Active className="w-4 h-4 mr-2" />
                  Executar Todos
              </Button>
          </div>

          <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teste</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Tabela</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resultado</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                      </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                      {tests.map((test) => (
                          <tr key={test.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.name}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono hidden sm:table-cell">{test.tableName || '-'}</td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                  {test.status === 'idle' && <Badge color="neutral">Aguardar</Badge>}
                                  {test.status === 'loading' && <Badge color="info">A testar...</Badge>}
                                  {test.status === 'success' && <Badge color="success">Sucesso</Badge>}
                                  {test.status === 'error' && <Badge color="danger">Erro</Badge>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {test.message || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                  <button 
                                    onClick={() => runTest(test)} 
                                    className="text-indigo-600 hover:text-indigo-900 font-bold disabled:opacity-50 text-sm border border-indigo-200 px-3 py-1 rounded hover:bg-indigo-50 transition-colors"
                                    disabled={test.status === 'loading'}
                                  >
                                      Testar
                                  </button>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* --- SECÇÃO 2: VISUALIZADOR DE DADOS --- */}
      <div className="bg-white shadow rounded-lg p-6 border border-gray-200">
          <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">2. Visualizador de Dados (Raw Data)</h3>
              <p className="text-gray-600 text-sm mb-4">
                  Inspecione o conteúdo atual da base de dados (limitado aos últimos 50 registos).
              </p>
              
              <div className="flex gap-4 items-center">
                  <select 
                      className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                      value={selectedTable}
                      onChange={handleTableChange}
                  >
                      <option value="">-- Selecionar Tabela --</option>
                      {AVAILABLE_TABLES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                  </select>
                  
                  {selectedTable && (
                      <Button size="sm" variant="ghost" onClick={() => fetchTableData(selectedTable)} disabled={dataLoading}>
                          {dataLoading ? 'A carregar...' : 'Atualizar'}
                      </Button>
                  )}
              </div>
          </div>

          {dataError && (
              <div className="bg-red-50 text-red-700 p-4 rounded mb-4 border border-red-200 text-sm">
                  <strong>Erro:</strong> {dataError}
              </div>
          )}

          {selectedTable && !dataLoading && tableData.length === 0 && !dataError && (
              <div className="text-center py-10 bg-gray-50 rounded border border-dashed border-gray-300 text-gray-500">
                  A tabela "{selectedTable}" está vazia ou não contém dados.
              </div>
          )}

          {tableData.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[500px]">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                          <tr>
                              {Object.keys(tableData[0]).map(key => (
                                  <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50">
                                      {key}
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {tableData.map((row, idx) => (
                              <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                                  {Object.values(row).map((val, cellIdx) => (
                                      <td key={cellIdx} className="px-4 py-2 whitespace-nowrap border-r border-gray-100 last:border-0">
                                          {renderCellValue(val)}
                                      </td>
                                  ))}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
          
          {selectedTable && tableData.length > 0 && (
              <p className="text-xs text-gray-400 mt-2 text-right">Mostrando {tableData.length} registos.</p>
          )}
      </div>
    </div>
  );
}
