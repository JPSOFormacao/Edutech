import React, { useState } from 'react';
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

export default function DatabaseTest() {
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

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-3 mb-6">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Icons.Active className="w-6 h-6" />
        </div>
        <div>
            <h2 className="text-2xl font-bold text-gray-900">Diagnóstico de Base de Dados</h2>
            <p className="text-sm text-gray-500">Teste a conectividade com as tabelas do Supabase.</p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6 flex justify-between items-center">
              <p className="text-gray-600 text-sm">
                  Utilize esta ferramenta para verificar se a aplicação consegue comunicar corretamente com o Supabase.
              </p>
              <Button onClick={runAllTests}>
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
    </div>
  );
}