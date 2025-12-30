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
  
  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR;

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = () => {
    const allCourses = storageService.getCourses();
    const allMaterials = storageService.getMaterials();
    
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

  const handleSave = () => {
    if (!editingMaterial.title || !editingMaterial.courseId) return;
    
    const allMaterials = storageService.getMaterials();
    const index = allMaterials.findIndex(m => m.id === editingMaterial.id);
    const newMaterials = [...allMaterials];
    
    if (index >= 0) {
      newMaterials[index] = editingMaterial as Material;
    } else {
      newMaterials.push(editingMaterial as Material);
    }

    storageService.saveMaterials(newMaterials);
    loadData();
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Eliminar este material?')) {
        const allMaterials = storageService.getMaterials();
        const updated = allMaterials.filter(m => m.id !== id);
        storageService.saveMaterials(updated);
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

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {materials.length === 0 && (
              <li className="p-8 text-center text-gray-500">Não existem materiais disponíveis.</li>
          )}
          {materials.map((material) => {
            const course = courses.find(c => c.id === material.courseId);
            return (
              <li key={material.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                        <div className="flex-shrink-0 mr-4">
                            {getMaterialIcon(material.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                             <p className="text-sm font-medium text-indigo-600 truncate">{material.title}</p>
                             <div className="flex items-center mt-1">
                                <span className="text-xs text-gray-500 mr-2">{course?.title || 'Curso Removido'}</span>
                                <Badge color="neutral">{material.type}</Badge>
                             </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <a 
                           href={material.linkOrContent} 
                           target="_blank" 
                           rel="noreferrer"
                           className="text-gray-400 hover:text-gray-600"
                           title="Abrir Recurso"
                         >
                             <Icons.Link className="w-5 h-5" />
                         </a>
                         {canEdit && (
                            <button onClick={() => handleDelete(material.id)} className="text-red-400 hover:text-red-600 ml-2">
                                <Icons.Delete className="w-5 h-5" />
                            </button>
                         )}
                    </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Novo Material"
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
                        <option key={t} value={t}>{t}</option>
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