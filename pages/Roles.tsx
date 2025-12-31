
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { RoleEntity, PERMISSIONS, PERMISSION_LABELS } from '../types';
import { Button, Modal, Input, Badge } from '../components/UI';
import { Icons } from '../components/Icons';

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleEntity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Agora usamos apenas os valores das permissões para iterar e buscamos o label no dicionário
  const [permissionsList] = useState(Object.values(PERMISSIONS));

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

  // Helper para obter o nome amigável
  const getPermissionLabel = (perm: string) => {
      return PERMISSION_LABELS[perm] || perm;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Cargos e Acessos</h2>
        <Button onClick={handleCreate} icon={Icons.Plus}>Novo Cargo</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roles.map(role => (
            <div key={role.id} className="bg-white shadow rounded-lg p-6 border border-gray-200 flex flex-col h-full">
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
                <div className="flex flex-wrap gap-2 mb-4">
                    {role.permissions.slice(0, 4).map(p => (
                        <span key={p} className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border truncate max-w-[200px]" title={getPermissionLabel(p)}>
                            {getPermissionLabel(p)}
                        </span>
                    ))}
                    {role.permissions.length > 4 && (
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500 border">
                            +{role.permissions.length - 4}
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
                placeholder="Ex: Coordenador Pedagógico"
            />
            
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Definição de Acessos</label>
                <div className="border rounded-md p-4 max-h-80 overflow-y-auto space-y-2 bg-gray-50">
                    {permissionsList.map((permValue) => (
                        <label key={permValue} className="flex items-start space-x-3 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                            <input 
                                type="checkbox"
                                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={selectedRole.permissions.includes(permValue)}
                                onChange={() => togglePermission(permValue)}
                                disabled={selectedRole.isSystem && selectedRole.id === 'role_admin'}
                            />
                            <span className="text-sm text-gray-700 font-medium leading-tight pt-0.5">
                                {getPermissionLabel(permValue)}
                            </span>
                        </label>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Selecione as funcionalidades que este cargo poderá aceder na plataforma.
                </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
