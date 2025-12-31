import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Course, UserRole } from '../types';
import { useAuth } from '../App';
import { Button, Modal, Input, formatCurrency } from '../components/UI';
import { Icons } from '../components/Icons';

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course>>({});
  const [loading, setLoading] = useState(true);
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR;

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    setLoading(true);
    const allCourses = await storageService.getCourses();
    if (user?.role === UserRole.ALUNO) {
      setCourses(allCourses.filter(c => user.allowedCourses.includes(c.id)));
    } else {
      setCourses(allCourses);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingCourse({
      id: Date.now().toString(),
      title: '',
      category: '',
      description: '',
      imageUrl: 'https://picsum.photos/400/250',
      duration: '',
      price: 0
    });
    setIsModalOpen(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse({ ...course });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem a certeza que deseja eliminar este curso? Esta ação é irreversível.')) {
      await storageService.deleteCourse(id);
      loadCourses();
    }
  };

  const handleSave = async () => {
    if (!editingCourse.title) return;
    
    // Como é upsert, basta mandar o objeto
    await storageService.saveCourses([editingCourse as Course]);
    
    loadCourses(); 
    setIsModalOpen(false);
  };

  if (loading) return <div className="p-8 text-center text-gray-500">A carregar cursos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Cursos Disponíveis</h2>
        {canEdit && (
          <Button onClick={handleCreate} icon={Icons.Plus}>
            Novo Curso
          </Button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
            <Icons.Courses className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sem cursos</h3>
            <p className="mt-1 text-sm text-gray-500">Nenhum curso disponível neste momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map(course => (
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

                {canEdit && (
                    <div className="mt-4 pt-3 border-t flex justify-end gap-2">
                         <button onClick={() => handleEdit(course)} className="text-indigo-600 hover:text-indigo-800 p-2 rounded-full hover:bg-indigo-50">
                             <Icons.Edit className="w-4 h-4" />
                         </button>
                         <button onClick={() => handleDelete(course.id)} className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50">
                             <Icons.Delete className="w-4 h-4" />
                         </button>
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingCourse.id && courses.find(c => c.id === editingCourse.id) ? "Editar Curso" : "Novo Curso"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input 
            label="Título do Curso" 
            value={editingCourse.title || ''} 
            onChange={e => setEditingCourse({...editingCourse, title: e.target.value})} 
            placeholder="Ex: Introdução ao Python"
          />
           <div className="grid grid-cols-2 gap-4">
               <Input 
                label="Categoria" 
                value={editingCourse.category || ''} 
                onChange={e => setEditingCourse({...editingCourse, category: e.target.value})} 
                placeholder="Ex: Programação"
               />
               <Input 
                label="Duração" 
                value={editingCourse.duration || ''} 
                onChange={e => setEditingCourse({...editingCourse, duration: e.target.value})} 
                placeholder="Ex: 20 Horas"
               />
           </div>
           
           <Input 
            label="Preço (€)" 
            type="number"
            step="0.01"
            value={editingCourse.price || 0} 
            onChange={e => setEditingCourse({...editingCourse, price: parseFloat(e.target.value)})} 
           />

           <Input 
            label="URL da Imagem" 
            value={editingCourse.imageUrl || ''} 
            onChange={e => setEditingCourse({...editingCourse, imageUrl: e.target.value})} 
            placeholder="https://..."
           />

           <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
               <textarea 
                 rows={4}
                 className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md border p-2"
                 value={editingCourse.description || ''}
                 onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
               />
           </div>
        </div>
      </Modal>
    </div>
  );
}