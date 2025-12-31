import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Course, UserRole } from '../types';
import { useAuth } from '../App';
import { Button, formatCurrency, Modal } from '../components/UI';
import { Icons } from '../components/Icons';
import { useNavigate } from 'react-router-dom';

export default function CatalogPage() {
  const { user, refreshUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // Modal State
  const [courseToEnroll, setCourseToEnroll] = useState<string | null>(null);

  useEffect(() => {
    const loadCourses = async () => {
      const data = await storageService.getCourses();
      setCourses(data);
      setLoading(false);
    };
    loadCourses();
  }, []);

  const openEnrollModal = (courseId: string) => {
      if(!user) return;
      setCourseToEnroll(courseId);
  };

  const confirmEnrollment = async () => {
      if (!user || !courseToEnroll) return;

      const currentRequests = user.enrollmentRequests || [];
      const updatedUser = {
          ...user,
          enrollmentRequests: [
              ...currentRequests, 
              {
                  courseId: courseToEnroll,
                  requestedAt: new Date().toISOString(),
                  status: 'PENDING'
              }
          ]
      };

      try {
          // @ts-ignore
          await storageService.saveUser(updatedUser);
          await refreshUser();
          alert("Pedido enviado com sucesso!");
      } catch(e) {
          alert("Erro ao enviar pedido.");
      } finally {
          setCourseToEnroll(null);
      }
  };

  const getStatus = (courseId: string) => {
      if (!user) return 'guest';
      if (user.allowedCourses.includes(courseId)) return 'enrolled';
      
      const req = user.enrollmentRequests?.find(r => r.courseId === courseId);
      if (req) return req.status; // PENDING, REJECTED, APPROVED (though approved usually implies allowedCourses)

      return 'available';
  };

  if (loading) return <div className="p-8 text-center text-gray-500">A carregar catálogo...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Icons.Search className="w-6 h-6 text-indigo-600" />
            Oferta Formativa
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => {
            const status = getStatus(course.id);
            return (
                <div key={course.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200 flex flex-col">
                    <div className="h-48 w-full relative">
                        <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2">
                            <span className="bg-white/90 backdrop-blur px-2 py-1 text-xs font-bold rounded-full text-indigo-700 shadow-sm">
                                {course.category}
                            </span>
                        </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h3>
                        <p className="text-sm text-gray-500 line-clamp-3 mb-4 flex-1">{course.description}</p>
                        
                        <div className="mb-4">
                             {(course.syllabus || course.requirements) && (
                                <div className="flex gap-2">
                                    {course.syllabus && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Conteúdo Detalhado</span>}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-medium uppercase">Duração</span>
                                <span className="text-sm text-gray-700">{course.duration}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-xs text-gray-400 font-medium uppercase">Preço</span>
                                <span className="text-lg font-bold text-indigo-600">{formatCurrency(course.price)}</span>
                            </div>
                        </div>

                        <div className="mt-4">
                            {status === 'enrolled' ? (
                                <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => navigate('/courses')}>
                                    <Icons.Check className="w-4 h-4 mr-2" />
                                    Aceder ao Curso
                                </Button>
                            ) : status === 'PENDING' ? (
                                <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-white cursor-default" disabled>
                                    <Icons.More className="w-4 h-4 mr-2" />
                                    Aprovação Pendente
                                </Button>
                            ) : (
                                <Button className="w-full" onClick={() => openEnrollModal(course.id)}>
                                    Inscrever-se
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            );
          })}
      </div>

      {/* Enrollment Confirmation Modal */}
      <Modal 
        isOpen={!!courseToEnroll} 
        onClose={() => setCourseToEnroll(null)} 
        title="Confirmar Pedido de Inscrição"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCourseToEnroll(null)}>Cancelar</Button>
            <Button variant="primary" onClick={confirmEnrollment}>Confirmar e Enviar</Button>
          </>
        }
      >
        <div className="space-y-4 p-2 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-2">
                <Icons.Mail className="h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-lg font-medium text-gray-900">
                Deseja enviar um pedido de inscrição para este curso?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-sm text-yellow-800">
                <p>
                    O Administrador só irá aprovar após o pagamento ser confirmado.
                </p>
                <p className="font-bold mt-2">
                    Deve enviar o comprovativo de pagamento para o email da <span className="underline">EduTech PT</span> com o seu nome completo.
                </p>
            </div>
        </div>
      </Modal>
    </div>
  );
}