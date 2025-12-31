import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { storageService } from '../services/storageService';
import { User, ClassEntity, UserRole, Course } from '../types';
import { Icons } from '../components/Icons';

export default function CommunityPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [allUsers, allClasses, allCourses] = await Promise.all([
        storageService.getUsers(),
        storageService.getClasses(),
        storageService.getCourses()
    ]);
    
    // Filtragem de Dados
    // Admin, Editor e Formador veem todos. Aluno vê apenas a sua turma.
    if (user && (user.role === UserRole.ADMIN || user.role === UserRole.EDITOR)) {
        setUsers(allUsers);
    } else if (user && user.classId) {
        setUsers(allUsers.filter(u => u.classId === user.classId));
    } else {
        // Aluno sem turma vê apenas ele próprio ou vazio
        setUsers(allUsers.filter(u => u.id === user?.id));
    }

    setClasses(allClasses);
    setCourses(allCourses);
    setLoading(false);
  };

  const getClassName = (classId?: string) => {
      const cls = classes.find(c => c.id === classId);
      return cls ? cls.name : 'Sem Turma';
  };

  // Agrupar por turmas se for Admin/Editor
  const groupedUsers = React.useMemo(() => {
      const groups: Record<string, User[]> = {};
      users.forEach(u => {
          const key = u.classId || 'unassigned';
          if (!groups[key]) groups[key] = [];
          groups[key].push(u);
      });
      return groups;
  }, [users]);

  // Verificar se utilizador atual tem permissão de "Super View" (Admin) para dados privados
  const isSuperAdmin = user?.role === UserRole.ADMIN;

  const UserCard = ({ student }: { student: User }) => {
      const isMe = student.id === user?.id;
      const privacy = student.privacySettings || { showEmail: false, showCourses: false, showBio: false };
      
      const canSeeEmail = isMe || isSuperAdmin || privacy.showEmail;
      const canSeeBio = isMe || isSuperAdmin || privacy.showBio;
      const canSeeCourses = isMe || isSuperAdmin || privacy.showCourses;

      const studentCourses = courses.filter(c => student.allowedCourses?.includes(c.id));

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

                  {/* Class Info */}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <Icons.Class className="w-4 h-4 text-gray-400" />
                      <span>{getClassName(student.classId)}</span>
                  </div>
                  
                  {/* Courses Count */}
                  {canSeeCourses && studentCourses.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-center mt-2">
                          {studentCourses.slice(0, 3).map(c => (
                              <span key={c.id} className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                                  {c.category}
                              </span>
                          ))}
                          {studentCourses.length > 3 && (
                               <span className="text-[10px] bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full border">
                                  +{studentCourses.length - 3}
                               </span>
                          )}
                      </div>
                  )}
              </div>
          </div>
      );
  };

  if (loading) return <div className="p-10 text-center">A carregar comunidade...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
         <div className="bg-green-600 p-2 rounded-lg text-white">
            <Icons.Class className="w-6 h-6" />
         </div>
         <div>
            <h2 className="text-2xl font-bold text-gray-900">Comunidade Escolar</h2>
            <p className="text-sm text-gray-500">
                {user?.role === UserRole.ALUNO 
                    ? `Colegas da ${getClassName(user?.classId)}` 
                    : 'Visão Global de Alunos e Formadores'}
            </p>
         </div>
      </div>

      {Object.keys(groupedUsers).length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <p className="text-gray-500">Não existem outros utilizadores na sua turma de momento.</p>
          </div>
      )}

      {Object.entries(groupedUsers).map(([classId, classUsers]) => {
          // Se for aluno, só vai haver 1 grupo (a sua turma)
          // Se for admin, mostra separadores por turma
          const showHeader = user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR;
          const className = classId === 'unassigned' ? 'Sem Turma Atribuída' : getClassName(classId);

          if (classUsers.length === 0) return null;

          return (
              <div key={classId} className="space-y-4">
                  {showHeader && (
                      <h3 className="text-lg font-bold text-gray-800 border-b pb-2 flex items-center gap-2 mt-8">
                          <Icons.UsersRound className="w-5 h-5 text-indigo-600" />
                          {className} 
                          <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">
                              {classUsers.length} membros
                          </span>
                      </h3>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {classUsers.map(student => (
                          <UserCard key={student.id} student={student} />
                      ))}
                  </div>
              </div>
          );
      })}
    </div>
  );
}