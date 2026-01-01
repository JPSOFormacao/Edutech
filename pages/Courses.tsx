import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
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
  
  // AI States
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isGeneratingSyl, setIsGeneratingSyl] = useState(false);

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR;

  useEffect(() => {
    loadCourses();
  }, [user]);

  const loadCourses = async () => {
    setLoading(true);
    const allCourses = await storageService.getCourses();
    if (user?.role === UserRole.ALUNO) {
      const allowed = user.allowedCourses || [];
      setCourses(allCourses.filter(c => allowed.includes(c.id)));
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
      price: 0,
      syllabus: '',
      requirements: '',
      certificationInfo: ''
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

  const generateDescription = async () => {
      if (!editingCourse.title) {
          alert("Escreva o título do curso primeiro para gerar a descrição.");
          return;
      }
      setIsGeneratingDesc(true);
      const prompt = `Escreva uma descrição atrativa e curta (max 3 frases) para um curso chamado "${editingCourse.title}" na categoria "${editingCourse.category || 'Geral'}".`;
      const text = await geminiService.generateText(prompt);
      if (text) {
          setEditingCourse({...editingCourse, description: text});
      }
      setIsGeneratingDesc(false);
  };

  const generateSyllabus = async () => {
      if (!editingCourse.title) {
          alert("Escreva o título do curso primeiro para gerar o conteúdo programático.");
          return;
      }
      setIsGeneratingSyl(true);
      const prompt = `Crie um conteúdo programático resumido (lista de módulos) para um curso chamado "${editingCourse.title}".`;
      const text = await geminiService.generateText(prompt);
      if (text) {
          setEditingCourse({...editingCourse, syllabus: text});
      }
      setIsGeneratingSyl(false);
  };

  if (loading) return <div className="p-10 text-center">A carregar cursos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Meus Cursos</h2>
        {canEdit && (
            <Button onClick={handleCreate} icon={Icons.Plus}>Novo Curso</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
                  Não está inscrito em nenhum curso.
              </div>
          ) : (
              courses.map(course => (
                  <div key={course.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200 flex flex-col group">
                        <div className="h-48 w-full relative overflow-hidden">
                            <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            <div className="absolute top-2 right-2">
                                <span className="bg-white/90 backdrop-blur px-2 py-1 text-xs font-bold rounded-full text-indigo-700 shadow-sm">
                                    {course.category}
                                </span>
                            </div>
                            {canEdit && (
                                <div className="absolute top-2 left-2 flex gap-1">
                                    <button onClick={() => handleEdit(course)} className="bg-white/90 p-1.5 rounded-full hover:text-indigo-600 transition-colors shadow-sm">
                                        <Icons.Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(course.id)} className="bg-white/90 p-1.5 rounded-full hover:text-red-600 transition-colors shadow-sm">
                                        <Icons.Delete className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{course.title}</h3>
                            <p className="text-sm text-gray-500 line-clamp-3 mb-4">{course.description}</p>
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-sm text-gray-600 bg-gray-50 px-2 py-1 rounded">{course.duration}</span>
                                <span className="text-lg font-bold text-indigo-600">{formatCurrency(course.price)}</span>
                            </div>
                        </div>
                  </div>
              ))
          )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCourse.id ? "Editar Curso" : "Novo Curso"}
        footer={
            <>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleSave}>Guardar</Button>
            </>
        }
      >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
              <Input 
                  label="Título do Curso"
                  value={editingCourse.title || ''}
                  onChange={e => setEditingCourse({...editingCourse, title: e.target.value})}
              />
              
              <Input 
                  label="Categoria"
                  value={editingCourse.category || ''}
                  onChange={e => setEditingCourse({...editingCourse, category: e.target.value})}
                  placeholder="Ex: Programação, Design..."
              />

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <div className="flex gap-2">
                      <textarea 
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                          rows={3}
                          value={editingCourse.description || ''}
                          onChange={e => setEditingCourse({...editingCourse, description: e.target.value})}
                      />
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={generateDescription}
                        disabled={isGeneratingDesc}
                        className="h-fit"
                        title="Gerar com IA"
                      >
                          {isGeneratingDesc ? '...' : <Icons.AI className="w-4 h-4" />}
                      </Button>
                  </div>
              </div>

              <Input 
                  label="URL da Imagem"
                  value={editingCourse.imageUrl || ''}
                  onChange={e => setEditingCourse({...editingCourse, imageUrl: e.target.value})}
              />

              <div className="grid grid-cols-2 gap-4">
                  <Input 
                      label="Duração"
                      value={editingCourse.duration || ''}
                      onChange={e => setEditingCourse({...editingCourse, duration: e.target.value})}
                      placeholder="Ex: 40 Horas"
                  />
                  <Input 
                      label="Preço (€)"
                      type="number"
                      value={editingCourse.price || 0}
                      onChange={e => setEditingCourse({...editingCourse, price: parseFloat(e.target.value)})}
                  />
              </div>

              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo Programático</label>
                  <div className="flex gap-2">
                      <textarea 
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border font-mono text-xs"
                          rows={4}
                          value={editingCourse.syllabus || ''}
                          onChange={e => setEditingCourse({...editingCourse, syllabus: e.target.value})}
                          placeholder="Módulo 1: ..."
                      />
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={generateSyllabus}
                        disabled={isGeneratingSyl}
                        className="h-fit"
                        title="Gerar com IA"
                      >
                          {isGeneratingSyl ? '...' : <Icons.AI className="w-4 h-4" />}
                      </Button>
                  </div>
              </div>

              <Input 
                  label="Requisitos"
                  value={editingCourse.requirements || ''}
                  onChange={e => setEditingCourse({...editingCourse, requirements: e.target.value})}
              />
              
              <Input 
                  label="Informação de Certificação"
                  value={editingCourse.certificationInfo || ''}
                  onChange={e => setEditingCourse({...editingCourse, certificationInfo: e.target.value})}
              />
          </div>
      </Modal>
    </div>
  );
}