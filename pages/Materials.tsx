import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { Material, MaterialType, UserRole, Course } from '../types';
import { useAuth } from '../App';
import { Button, Modal, Input, Badge } from '../components/UI';
import { Icons } from '../components/Icons';

export default function Materials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Partial<Material>>({});
  const [loading, setLoading] = useState(true);
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [allCourses, allMaterials] = await Promise.all([
        storageService.getCourses(),
        storageService.getMaterials()
    ]);
    
    if (user?.role === UserRole.ALUNO) {
        // Only courses allowed
        const allowed = allCourses.filter(c => user.allowedCourses.includes(c.id));
        setCourses(allowed);
        // Only materials from allowed courses
        setMaterials(allMaterials.filter(m => user.allowedCourses.includes(m.courseId)));
    } else {
        setCourses(allCourses);
        setMaterials(allMaterials);
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setEditingMaterial({
      id: Date.now().toString(),
      title: '',
      type: MaterialType.RECURSO,
      courseId: courses.length > 0 ? courses[0].id : '',
      linkOrContent: '',
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingMaterial.title || !editingMaterial.courseId) return;
    
    await storageService.saveMaterials([editingMaterial as Material]);
    loadData();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Eliminar este material?')) {
        await storageService.deleteMaterial(id);
        loadData();
    }
  };

  const getMaterialIcon = (type: MaterialType) => {
      switch(type) {
          case MaterialType.AVALIACAO: return <Icons.Quiz className="text-red-500" />;
          case MaterialType.DIAGNOSTICO: return <Icons.Search className="text-blue-500" />;
          case MaterialType.TRABALHO: return <Icons.Users className="text-green-500" />;
          default: return <Icons.Materials className="text-gray-500" />;
      }
  };

  const translateType = (type: MaterialType) => {
      switch (type) {
          case MaterialType.DIAGNOSTICO: return "Diagnóstico";
          case MaterialType.AVALIACAO: return "Avaliação";
          case MaterialType.TRABALHO: return "Trabalho";
          case MaterialType.RECURSO: return "Recurso";
          default: return type;
      }
  };

  // Group materials by Course
  const materialsByCourse = courses.reduce((acc, course) => {
      acc[course.id] = materials.filter(m => m.courseId === course.id);
      return acc;
  }, {} as Record<string, Material[]>);

  if (loading) return <div className="p-10 text-center">A carregar materiais...</div>;

  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Materiais Didáticos</h2>
        {canEdit && (
          <Button onClick={handleCreate} icon={Icons.Plus}>
            Adicionar Material
          </Button>
        )}
      </div>

      <div className="space-y-8">
        {courses.map(course => {
            const courseMaterials = materialsByCourse[course.id] || [];
            if (courseMaterials.length === 0 && !canEdit) return null;

            return (
                <div key={course.id} className="bg-white shadow rounded-lg overflow-hidden">
                     <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">{courseMaterials.length} Materiais</span>
                     </div>
                     <ul className="divide-y divide-gray-200">
                        {courseMaterials.length === 0 ? (
                             <li className="p-4 text-sm text-gray-500 italic">Sem materiais atribuídos.</li>
                        ) : (
                            courseMaterials.map((material) => (
                                <li key={material.id}>
                                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                                        <div className="flex items-center flex-1 min-w-0">
                                            <div className="flex-shrink-0 mr-4">
                                                {getMaterialIcon(material.type)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-indigo-600 truncate">{material.title}</p>
                                                <div className="flex items-center mt-1">
                                                    <Badge color="neutral">{translateType(material.type)}</Badge>
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        {new Date(material.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a 
                                            href={material.linkOrContent} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"
                                            title="Abrir Recurso"
                                            >
                                                <Icons.Link className="w-5 h-5" />
                                            </a>
                                            {canEdit && (
                                                <button onClick={() => {
                                                    setEditingMaterial(material);
                                                    setIsModalOpen(true);
                                                }} className="text-gray-400 hover:text-gray-600 ml-1 p-2 hover:bg-gray-100 rounded-full">
                                                    <Icons.Edit className="w-5 h-5" />
                                                </button>
                                            )}
                                            {canEdit && (
                                                <button onClick={() => handleDelete(material.id)} className="text-red-400 hover:text-red-600 ml-1 p-2 hover:bg-red-50 rounded-full">
                                                    <Icons.Delete className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))
                        )}
                     </ul>
                </div>
            );
        })}
        {courses.length === 0 && (
             <div className="p-8 text-center text-gray-500">Não existem cursos associados.</div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingMaterial.id ? "Editar Material" : "Novo Material"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </>
        }
      >
          <div className="space-y-4">
            <Input 
                label="Título do Material" 
                value={editingMaterial.title || ''} 
                onChange={e => setEditingMaterial({...editingMaterial, title: e.target.value})} 
            />
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Curso Associado</label>
                <select 
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2"
                    value={editingMaterial.courseId || ''}
                    onChange={e => setEditingMaterial({...editingMaterial, courseId: e.target.value})}
                >
                    {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Material</label>
                <select 
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2"
                    value={editingMaterial.type || MaterialType.RECURSO}
                    onChange={e => setEditingMaterial({...editingMaterial, type: e.target.value as MaterialType})}
                >
                    {Object.values(MaterialType).map(t => (
                        <option key={t} value={t}>{translateType(t)}</option>
                    ))}
                </select>
            </div>

            <Input 
                label="Link ou URL do Conteúdo" 
                value={editingMaterial.linkOrContent || ''} 
                onChange={e => setEditingMaterial({...editingMaterial, linkOrContent: e.target.value})} 
                placeholder="https://..."
            />
          </div>
      </Modal>
    </div>
  );
}