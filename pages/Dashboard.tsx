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
      { name: 'Total de Cursos', value: 0, icon: Icons.Courses, color: 'bg-indigo-500', link: '/courses' },
      { name: 'Materiais Disponíveis', value: 0, icon: Icons.Materials, color: 'bg-pink-500', link: '/materials' },
      { name: 'Alunos Registados', value: 0, icon: Icons.Users, color: 'bg-green-500', link: '/community' },
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

        if (user?.role === UserRole.ALUNO) {
            // Lógica para Aluno: Apenas contagens relevantes
            // Defesa contra allowedCourses undefined
            const userCourses = user.allowedCourses || [];
            
            const myClassUsers = usersData.filter(u => u.classId === user.classId);
            const myMaterials = materialsData.filter(m => userCourses.includes(m.courseId));
            const myCourses = coursesData.filter(c => userCourses.includes(c.id));

            setStats([
                { name: 'Meus Cursos', value: myCourses.length, icon: Icons.Courses, color: 'bg-indigo-500', link: '/courses' },
                { name: 'Materiais Disponíveis', value: myMaterials.length, icon: Icons.Materials, color: 'bg-pink-500', link: '/materials' },
                { name: 'Colegas de Turma', value: Math.max(0, myClassUsers.length - 1), icon: Icons.Class, color: 'bg-green-500', link: '/community' }, // Exclui o próprio
            ]);
            setCourses(myCourses);
        } else {
            // Lógica Admin/Editor: Totais Globais
            setStats([
                { name: 'Total de Cursos', value: coursesData.length, icon: Icons.Courses, color: 'bg-indigo-500', link: '/courses' },
                { name: 'Materiais Disponíveis', value: materialsData.length, icon: Icons.Materials, color: 'bg-pink-500', link: '/materials' },
                { name: 'Alunos Registados', value: usersData.filter(u => u.role === UserRole.ALUNO).length, icon: Icons.Users, color: 'bg-green-500', link: '/community' },
            ]);
            setCourses(coursesData);
        }
        setLoading(false);
    };

    if (user) loadData();
  }, [user]);

  const StatCard: React.FC<{ item: any }> = ({ item }) => (
    <Link to={item.link} className="block group">
        <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow border-transparent hover:border-indigo-500 border-2">
        <div className="p-5">
            <div className="flex items-center">
            <div className="flex-shrink-0">
                <div className={`rounded-md p-3 ${item.color} group-hover:opacity-90`}>
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
            </div>
            <div className="ml-5 w-0 flex-1">
                <dl>
                <dt className="text-sm font-medium text-gray-500 truncate group-hover:text-indigo-600">{item.name}</dt>
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
    </Link>
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
            <h3 className="text-lg leading-6 font-bold text-gray-900">
                {user?.role === UserRole.ALUNO ? 'Os Meus Cursos' : 'A Nossa Oferta Formativa'}
            </h3>
            <Link to="/courses" className="text-sm text-indigo-600 hover:text-indigo-800">Ver todos &rarr;</Link>
        </div>
        
        {loading ? (
             <p className="text-center py-10 text-gray-500">A carregar cursos...</p>
        ) : courses.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300 text-gray-500">
                 Sem cursos disponíveis.
             </div>
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
    </div>
  );
}