import React from 'react';
import { storageService } from '../services/storageService';
import { useAuth } from '../App';
import { Icons } from '../components/Icons';
import { UserRole } from '../types';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const users = storageService.getUsers();
  const courses = storageService.getCourses();
  const materials = storageService.getMaterials();

  const stats = [
    { name: 'Total de Cursos', value: courses.length, icon: Icons.Courses, color: 'bg-indigo-500' },
    { name: 'Materiais Disponíveis', value: materials.length, icon: Icons.Materials, color: 'bg-pink-500' },
    { name: 'Alunos Registados', value: users.filter(u => u.role === UserRole.ALUNO).length, icon: Icons.Users, color: 'bg-green-500' },
  ];

  const StatCard: React.FC<{ item: any }> = ({ item }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`rounded-md p-3 ${item.color}`}>
              <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{item.value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="md:flex md:items-center md:justify-between">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Olá, {user?.name.split(' ')[0]}!
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Bem-vindo ao painel de gestão da EduTech PT.
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
            <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString('pt-PT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.name} item={item} />
        ))}
      </div>

      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <Link to="/courses" className="block p-6 border rounded-lg hover:bg-gray-50 transition-colors group">
                 <div className="flex items-center">
                     <Icons.Courses className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                 </div>
                 <h4 className="font-semibold text-gray-900">Ver Cursos</h4>
                 <p className="text-sm text-gray-500 mt-1">Navegue pelo catálogo e veja os detalhes.</p>
             </Link>
             
             <Link to="/materials" className="block p-6 border rounded-lg hover:bg-gray-50 transition-colors group">
                 <div className="flex items-center">
                     <Icons.Materials className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                 </div>
                 <h4 className="font-semibold text-gray-900">Materiais Didáticos</h4>
                 <p className="text-sm text-gray-500 mt-1">Aceda a fichas e recursos de aprendizagem.</p>
             </Link>

             <Link to="/p/regulamento" className="block p-6 border rounded-lg hover:bg-gray-50 transition-colors group">
                 <div className="flex items-center">
                     <Icons.FileText className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                 </div>
                 <h4 className="font-semibold text-gray-900">Regulamento</h4>
                 <p className="text-sm text-gray-500 mt-1">Consulte as normas e procedimentos.</p>
             </Link>
        </div>
      </div>
    </div>
  );
}