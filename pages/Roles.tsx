import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { RoleEntity, PERMISSIONS } from '../types';
import { Button, Modal, Input, Badge } from '../components/UI';
import { Icons } from '../components/Icons';

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleEntity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [permissionsList] = useState(Object.entries(PERMISSIONS));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setRoles(storageService.getRoles());
  };

  const handleEdit = (role: RoleEntity) => {
    setSelectedRole({ ...role });
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedRole({
      id: 'role_' + Date.now(),
      name: '',
      permissions: [],
      isSystem: false
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedRole || !selectedRole.name) return;
    
    const existing = roles.find(r => r.id === selectedRole.id);
    let updatedRoles = [...roles];
    
    if (existing) {
        updatedRoles = roles.map(r => r.id === selectedRole.id ? selectedRole : r);
    } else {
        updatedRoles.push(selectedRole);
    }

    storageService.saveRoles(updatedRoles);
    setRoles(updatedRoles);
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem a certeza? Utilizadores associados a este cargo podem perder acesso.')) {
        const updated = roles.filter(r => r.id !== id);
        storageService.saveRoles(updated);
        setRoles(updated);
    }
  };

  const togglePermission = (permValue: string) => {
      if(!selectedRole) return;
      const current = selectedRole.permissions;
      if(current.includes(permValue)) {
          setSelectedRole({...selectedRole, permissions: current.filter(p => p !== permValue)});
      } else {
          setSelectedRole({...selectedRole, permissions: [...current, permValue]});
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Cargos e Acessos</h2>
        <Button onClick={handleCreate} icon={Icons.Plus}>Novo Cargo</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
            <div key={role.id} className="bg-white shadow rounded-lg p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                            <Icons.Role className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">{role.name}</h3>
                    </div>
                    {!role.isSystem && (
                        <div className="flex gap-1">
                             <button onClick={() => handleEdit(role)} className="p-1 hover:bg-gray-100 rounded text-indigo-600">
                                <Icons.Edit className="w-4 h-4" />
                             </button>
                             <button onClick={() => handleDelete(role.id)} className="p-1 hover:bg-gray-100 rounded text-red-600">
                                <Icons.Delete className="w-4 h-4" />
                             </button>
                        </div>
                    )}
                    {role.isSystem && (
                         <button onClick={() => handleEdit(role)} className="p-1 hover:bg-gray-100 rounded text-indigo-600">
                            <Icons.Edit className="w-4 h-4" />
                         </button>
                    )}
                </div>
                <div className="text-sm text-gray-500 mb-2 font-medium">Permissões:</div>
                <div className="flex flex-wrap gap-2">
                    {role.permissions.slice(0, 5).map(p => (
                        <span key={p} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border">
                            {p.replace(/_/g, ' ')}
                        </span>
                    ))}
                    {role.permissions.length > 5 && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 border">
                            +{role.permissions.length - 5}
                        </span>
                    )}
                </div>
            </div>
        ))}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedRole?.id && roles.find(r => r.id === selectedRole?.id) ? "Editar Cargo" : "Novo Cargo"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
          </>
        }
      >
        {selectedRole && (
          <div className="space-y-4">
            <Input 
                label="Nome do Cargo"
                value={selectedRole.name}
                onChange={e => setSelectedRole({...selectedRole, name: e.target.value})}
                disabled={selectedRole.isSystem && selectedRole.id === 'role_admin'}
            />
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Definição de Acessos</label>
                <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2 bg-gray-50">
                    {permissionsList.map(([key, value]) => (
                        <label key={key} className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer">
                            <input 
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={selectedRole.permissions.includes(value)}
                                onChange={() => togglePermission(value)}
                                disabled={selectedRole.isSystem && selectedRole.id === 'role_admin'}
                            />
                            <span className="text-sm text-gray-700 font-medium">{key}</span>
                        </label>
                    ))}
                </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}