import React, { useEffect, useState } from 'react';
import { storageService } from '../services/storageService';
import { useAuth } from '../App';
import { Icons } from '../components/Icons';
import { UserRole } from '../types';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../components/UI';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState([
      { name: 'Total de Cursos', value: 0, icon: Icons.Courses, color: 'bg-indigo-500' },
      { name: 'Materiais Disponíveis', value: 0, icon: Icons.Materials, color: 'bg-pink-500' },
      { name: 'Alunos Registados', value: 0, icon: Icons.Users, color: 'bg-green-500' },
  ]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const [usersData, coursesData, materialsData] = await Promise.all([
            storageService.getUsers(),
            storageService.getCourses(),
            storageService.getMaterials()
        ]);

        setStats([
            { name: 'Total de Cursos', value: coursesData.length, icon: Icons.Courses, color: 'bg-indigo-500' },
            { name: 'Materiais Disponíveis', value: materialsData.length, icon: Icons.Materials, color: 'bg-pink-500' },
            { name: 'Alunos Registados', value: usersData.filter(u => u.role === UserRole.ALUNO).length, icon: Icons.Users, color: 'bg-green-500' },
        ]);
        setCourses(coursesData);
        setLoading(false);
    };

    loadData();
  }, []);

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
                <div className="text-lg font-medium text-gray-900">
                    {loading ? '...' : item.value}
                </div>
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
            Bem-vindo à EduTech PT (Base de dados: Supabase).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((item) => (
          <StatCard key={item.name} item={item} />
        ))}
      </div>
      
      {/* Featured Courses / Offerings */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-bold text-gray-900">A Nossa Oferta Formativa</h3>
            <Link to="/courses" className="text-sm text-indigo-600 hover:text-indigo-800">Ver todos &rarr;</Link>
        </div>
        
        {loading ? (
             <p className="text-center py-10 text-gray-500">A carregar cursos...</p>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {courses.map(course => (
                <div key={course.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200 flex flex-col group">
                  <div className="h-40 w-full relative overflow-hidden rounded-t-lg">
                    <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute top-2 right-2">
                        <span className="bg-white/90 backdrop-blur px-2 py-1 text-xs font-bold rounded-full text-indigo-700 shadow-sm">
                            {course.category}
                        </span>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-md font-bold text-gray-900 mb-1">{course.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto">
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {course.duration}
                        </span>
                        <span className="text-lg font-bold text-indigo-600">{formatCurrency(course.price)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>
      
      {/* Links */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recursos Úteis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Link to="/materials" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                 <div className="bg-pink-100 p-2 rounded-full mr-4">
                    <Icons.Materials className="w-6 h-6 text-pink-600" />
                 </div>
                 <div>
                    <h4 className="font-semibold text-gray-900">Materiais Didáticos</h4>
                    <p className="text-xs text-gray-500">Aceda a todos os recursos disponíveis.</p>
                 </div>
             </Link>

             <Link to="/p/regulamento" className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors flex items-center">
                 <div className="bg-indigo-100 p-2 rounded-full mr-4">
                     <Icons.FileText className="w-6 h-6 text-indigo-600" />
                 </div>
                 <div>
                     <h4 className="font-semibold text-gray-900">Regulamento</h4>
                     <p className="text-xs text-gray-500">Normas da formação.</p>
                 </div>
             </Link>
        </div>
      </div>
    </div>
  );
}