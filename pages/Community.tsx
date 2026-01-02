import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { storageService } from '../services/storageService';
import { User, ClassEntity, UserRole, Course } from '../types';
import { Icons } from '../components/Icons';

interface UserCardProps {
  student: User;
  currentUser: User | null;
  isSuperAdmin: boolean;
}

// Extract UserCard outside to fix key prop issue and improve performance
const UserCard: React.FC<UserCardProps> = ({ student, currentUser, isSuperAdmin }) => {
    const isMe = student.id === currentUser?.id;
    const privacy = student.privacySettings || { showEmail: false, showCourses: false, showBio: false };
    
    const canSeeEmail = isMe || isSuperAdmin || privacy.showEmail;
    const canSeeBio = isMe || isSuperAdmin || privacy.showBio;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow relative overflow-hidden">
            {isMe && <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">Eu</div>}
            
            <img 
                src={student.avatarUrl || 'https://via.placeholder.com/150'} 
                alt={student.name} 
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-100 mb-4"
            />
            
            <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{student.name}</h3>
            <p className="text-indigo-600 text-xs font-medium uppercase tracking-wide mb-3">{student.role}</p>
            
            {/* Bio Section */}
            {canSeeBio && student.bio ? (
                <p className="text-gray-500 text-sm mb-4 line-clamp-3 italic">"{student.bio}"</p>
            ) : (
                <div className="flex-1 w-full flex items-center justify-center mb-4 min-h-[3rem]">
                        <span className="text-gray-300 text-xs italic">Sem biografia pública</span>
                </div>
            )}

            <div className="w-full border-t pt-4 space-y-3 mt-auto">
                {/* Email */}
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                    <Icons.Mail className="w-4 h-4 text-gray-400" />
                    {canSeeEmail ? (
                        <a href={`mailto:${student.email}`} className="hover:text-indigo-600 truncate max-w-[180px]" title={student.email}>
                            {student.email}
                        </a>
                    ) : (
                        <span className="text-gray-400 italic">Privado</span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function CommunityPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [allUsers, allCourses] = await Promise.all([
        storageService.getUsers(),
        storageService.getCourses()
    ]);
    
    // Alunos só veem cursos que têm
    if (user?.role === UserRole.ALUNO) {
        setCourses(allCourses.filter(c => user.allowedCourses.includes(c.id)));
    } else {
        setCourses(allCourses);
    }
    setUsers(allUsers);
    setLoading(false);
  };

  // Agrupar por Curso
  // Nota: Um aluno pode aparecer em múltiplos cursos.
  const groupedByCourse = React.useMemo(() => {
      const groups: Record<string, User[]> = {};
      courses.forEach(course => {
          // Find all users enrolled in this course
          const enrolled = users.filter(u => u.allowedCourses?.includes(course.id));
          
          // Se sou aluno, só mostro este curso se EU estiver inscrito (já filtrado no loadData)
          // Mas garanto que mostro apenas colegas (ou eu mesmo) inscritos nisto.
          groups[course.id] = enrolled;
      });
      return groups;
  }, [users, courses]);

  // Verificar se utilizador atual tem permissão de "Super View" (Admin) para dados privados
  const isSuperAdmin = user?.role === UserRole.ADMIN;

  if (loading) return <div className="p-10 text-center">A carregar comunidade...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
         <div className="bg-green-600 p-2 rounded-lg text-white">
            <Icons.UsersRound className="w-6 h-6" />
         </div>
         <div>
            <h2 className="text-2xl font-bold text-gray-900">Comunidade Escolar</h2>
            <p className="text-sm text-gray-500">
                Organizado por Cursos
            </p>
         </div>
      </div>

      {courses.length === 0 && (
           <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <p className="text-gray-500">Não está inscrito em nenhum curso.</p>
          </div>
      )}

      {courses.map(course => {
          const classUsers = groupedByCourse[course.id] || [];
          if (classUsers.length === 0) return null;

          return (
              <div key={course.id} className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2 mt-8">
                      <Icons.Courses className="w-5 h-5 text-indigo-600" />
                      {course.title}
                      <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">
                          {classUsers.length} inscritos
                      </span>
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {classUsers.map(student => (
                          <UserCard 
                              key={`${course.id}-${student.id}`} 
                              student={student} 
                              currentUser={user}
                              isSuperAdmin={isSuperAdmin}
                          />
                      ))}
                  </div>
              </div>
          );
      })}
    </div>
  );
}