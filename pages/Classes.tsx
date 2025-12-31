import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { ClassEntity } from '../types';
import { Button, Modal, Input } from '../components/UI';
import { Icons } from '../components/Icons';

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassEntity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const cls = await storageService.getClasses();
    setClasses(cls);
    
    // Count users per class
    const users = await storageService.getUsers();
    const counts: Record<string, number> = {};
    cls.forEach(c => {
        counts[c.id] = users.filter(u => u.classId === c.id).length;
    });
    setUserCounts(counts);
    setLoading(false);
  };

  const handleEdit = (cls: ClassEntity) => {
    setSelectedClass({ ...cls });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedClass({
      id: 'class_' + Date.now(),
      name: '',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedClass.name) return;
    
    await storageService.saveClasses([selectedClass]);
    loadData(); 
    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (userCounts[id] > 0) {
        alert("Não é possível apagar uma turma que tem alunos associados. Remova os alunos primeiro.");
        return;
    }
    if (confirm('Eliminar esta turma permanentemente?')) {
        await storageService.deleteClass(id);
        loadData();
    }
  };

  if (loading) return <div className="p-10 text-center">A carregar turmas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Turmas</h2>
        <Button onClick={handleCreate} icon={Icons.Plus}>Nova Turma</Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
         {classes.length === 0 ? (
             <div className="p-8 text-center text-gray-500">Nenhuma turma criada.</div>
         ) : (
             <ul className="divide-y divide-gray-200">
                 {classes.map(cls => (
                     <li key={cls.id}>
                         <div className="px-4 py-4 sm:px-6 flex items-center justify-between hover:bg-gray-50">
                             <div className="flex items-center">
                                 <div className="flex-shrink-0 bg-indigo-100 rounded-md p-2">
                                     <Icons.Class className="h-6 w-6 text-indigo-600" />
                                 </div>
                                 <div className="ml-4">
                                     <h3 className="text-lg leading-6 font-medium text-gray-900">{cls.name}</h3>
                                     <p className="text-sm text-gray-500">{cls.description}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-4">
                                 <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                     {userCounts[cls.id] || 0} Alunos
                                 </div>
                                 <div className="flex gap-2">
                                     <button onClick={() => handleEdit(cls)} className="text-indigo-600 hover:text-indigo-900 p-2">
                                         <Icons.Edit className="w-5 h-5" />
                                     </button>
                                     <button onClick={() => handleDelete(cls.id)} className="text-red-600 hover:text-red-900 p-2">
                                         <Icons.Delete className="w-5 h-5" />
                                     </button>
                                 </div>
                             </div>
                         </div>
                     </li>
                 ))}
             </ul>
         )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedClass?.id && classes.find(c => c.id === selectedClass?.id) ? "Editar Turma" : "Nova Turma"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </>
        }
      >
        {selectedClass && (
          <div className="space-y-4">
            <Input 
                label="Nome da Turma"
                value={selectedClass.name}
                onChange={e => setSelectedClass({...selectedClass, name: e.target.value})}
                placeholder="Ex: Turma A - 2025"
            />
            <Input 
                label="Descrição (Opcional)"
                value={selectedClass.description || ''}
                onChange={e => setSelectedClass({...selectedClass, description: e.target.value})}
                placeholder="Ex: Horário Pós-Laboral"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}