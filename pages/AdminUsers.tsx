import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { User, UserRole, UserStatus, Course, ClassEntity, RoleEntity } from '../types';
import { Badge, Button, Modal, Input } from '../components/UI';
import { Icons } from '../components/Icons';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [u, c, cl, r] = await Promise.all([
        storageService.getUsers(),
        storageService.getCourses(),
        storageService.getClasses(),
        storageService.getRoles()
    ]);
    setUsers(u);
    setCourses(c);
    setClasses(cl);
    setRoles(r);
    setLoading(false);
  };

  // Helpers
  const generateRandomPassword = () => {
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$";
      let retVal = "";
      for (let i = 0; i < 10; ++i) {
          retVal += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return retVal;
  };

  const translateStatus = (status: UserStatus) => {
      switch (status) {
          case UserStatus.ACTIVE: return "Ativo";
          case UserStatus.PENDING: return "Pendente";
          case UserStatus.BLOCKED: return "Bloqueado";
          default: return status;
      }
  };

  const handleEdit = (user: User) => {
    setSelectedUser({ ...user }); 
    setNewPassword(''); 
    setIsModalOpen(true);
  };

  const handleCreate = () => {
      setSelectedUser({
          id: Date.now().toString(),
          name: '',
          email: '',
          role: UserRole.ALUNO, 
          roleId: roles.find(r => r.name === 'Aluno')?.id || roles[0]?.id || '',
          status: UserStatus.ACTIVE,
          allowedCourses: [],
          avatarUrl: 'https://via.placeholder.com/100',
          mustChangePassword: true,
          classId: ''
      });
      setNewPassword(generateRandomPassword()); 
      setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setIsSendingEmail(true); // Usar este estado para bloqueio geral de UI
    
    // Recarregar fresh para verificar duplicados no backend
    const currentUsers = await storageService.getUsers();
    
    let userToSave = { ...selectedUser };
    
    if (userToSave.email) {
        userToSave.email = userToSave.email.trim().toLowerCase();
    } else {
        alert("O email é obrigatório.");
        setIsSendingEmail(false);
        return;
    }

    let isPasswordReset = false;
    if (newPassword) {
        userToSave.password = newPassword;
        userToSave.mustChangePassword = true; 
        isPasswordReset = true;
    }
    
    // Sync Legacy Enum
    const selectedRoleObj = roles.find(r => r.id === userToSave.roleId);
    if (selectedRoleObj) {
        if (selectedRoleObj.name.toLowerCase().includes('admin')) userToSave.role = UserRole.ADMIN;
        else if (selectedRoleObj.name.toLowerCase().includes('formador')) userToSave.role = UserRole.EDITOR;
        else userToSave.role = UserRole.ALUNO;
    }

    const exists = currentUsers.find(u => u.id === userToSave.id);

    if (exists) {
        // UPDATE
        // Verificar se estamos a criar duplicado de email em outro ID
        const duplicate = currentUsers.find(u => u.email === userToSave.email && u.id !== userToSave.id);
        if (duplicate) {
             alert("Email já existe noutro utilizador.");
             setIsSendingEmail(false);
             return;
        }

        await storageService.saveUser(userToSave);
        
        if (isPasswordReset) {
            const config = await storageService.getEmailConfig();
            if (config) {
                await emailService.sendPasswordReset(userToSave.name, userToSave.email, newPassword, userToSave.classId, userToSave.allowedCourses);
            }
        }
    } else {
        // CREATE
        const duplicate = currentUsers.find(u => u.email === userToSave.email);
        if (duplicate) {
             alert(`JÁ EXISTE um utilizador com o email "${userToSave.email}".`);
             setIsSendingEmail(false);
             return;
        }

        await storageService.saveUser(userToSave);
        
        const config = await storageService.getEmailConfig();
        if (config) {
            await emailService.sendWelcomeEmail(userToSave.name, userToSave.email, newPassword, userToSave.classId, userToSave.allowedCourses);
        }
    }
    
    await loadData();
    setIsSendingEmail(false);
    setIsModalOpen(false);
  };

  const handleBulkDelete = async () => {
      if(selectedIds.length === 0) return;
      if(confirm(`Tem a certeza que deseja apagar ${selectedIds.length} utilizadores?`)) {
          setLoading(true);
          for (const id of selectedIds) {
              await storageService.deleteUser(id);
          }
          await loadData();
          setSelectedIds([]);
      }
  };

  const handleBulkAdd = async () => {
      if(!bulkText) return;
      setLoading(true);
      
      const lines = bulkText.split('\n').filter(line => line.trim().length > 0);
      const freshUsers = await storageService.getUsers();
      
      let count = 0;
      const roleToAssign = roles.find(r => r.id === bulkRoleId);
      const legacyRole = roleToAssign?.name.toLowerCase().includes('admin') ? UserRole.ADMIN : 
                         roleToAssign?.name.toLowerCase().includes('formador') ? UserRole.EDITOR : UserRole.ALUNO;

      const usersToInsert = [];

      for (const line of lines) {
          const parts = line.split(/[;,]/); 
          if(parts.length >= 2) {
              const name = parts[0].trim();
              const email = parts[1].trim().toLowerCase();
              
              const exists = freshUsers.some(u => u.email === email) || usersToInsert.some(u => u.email === email);
              
              if(email.includes('@') && !exists) {
                  usersToInsert.push({
                      id: Date.now().toString() + Math.floor(Math.random() * 1000),
                      name,
                      email,
                      password: generateRandomPassword(),
                      role: legacyRole,
                      roleId: bulkRoleId,
                      classId: bulkClassId || undefined,
                      status: UserStatus.ACTIVE,
                      allowedCourses: [],
                      mustChangePassword: true,
                      avatarUrl: `https://ui-avatars.com/api/?name=${name}&background=random`
                  });
                  count++;
              }
          }
      }

      if (usersToInsert.length > 0) {
          await storageService.saveUsers(usersToInsert);
          alert(`${count} utilizadores adicionados.`);
      } else {
          alert("Nenhum utilizador novo encontrado.");
      }
      
      await loadData();
      setIsBulkAddOpen(false);
      setBulkText('');
  };

  const approveUser = async (user: User) => {
      const updated = {...user, status: UserStatus.ACTIVE};
      await storageService.saveUser(updated);
      await loadData();
  }

  const getClassName = (id?: string) => classes.find(c => c.id === id)?.name || '-';
  const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Cargo desconhecido';

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) setSelectedIds([]);
    else setSelectedIds(users.map(u => u.id));
  };
  const toggleSelectUser = (id: string) => {
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
      else setSelectedIds([...selectedIds, id]);
  };

  if (loading) return <div className="p-10 text-center">A carregar dados do Supabase...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Utilizadores</h2>
        <div className="flex gap-2">
            {selectedIds.length > 0 && (
                <Button variant="danger" onClick={handleBulkDelete} icon={Icons.Delete}>
                    Apagar ({selectedIds.length})
                </Button>
            )}
            <Button variant="secondary" onClick={() => setIsBulkAddOpen(true)} icon={Icons.Users}>Importar Vários</Button>
            <Button onClick={handleCreate} icon={Icons.Plus}>Novo Utilizador</Button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                    <input 
                        type="checkbox" 
                        checked={selectedIds.length === users.length && users.length > 0} 
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilizador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, idx) => (
                <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {getRoleName(user.roleId)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getClassName(user.classId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge color={user.status === UserStatus.ACTIVE ? 'success' : user.status === UserStatus.PENDING ? 'warning' : 'danger'}>
                      {translateStatus(user.status)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                     {user.status === UserStatus.PENDING && (
                         <Button variant="primary" size="sm" className="mr-2" onClick={() => approveUser(user)}>
                             Aprovar
                         </Button>
                     )}
                    <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900">
                      <Icons.Edit className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals remain mostly the same, handling state locally */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={selectedUser?.id && users.find(u => u.id === selectedUser.id) ? "Editar Utilizador" : "Novo Utilizador"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSendingEmail}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSendingEmail}>
                {isSendingEmail ? 'A processar...' : 'Guardar'}
            </Button>
          </>
        }
      >
          {/* Form Content Identical to Previous */}
          {selectedUser && (
          <div className="space-y-4">
            <Input 
                label="Nome"
                value={selectedUser.name}
                onChange={e => setSelectedUser({...selectedUser, name: e.target.value})}
            />
            
            <Input 
                label="Email"
                type="email"
                value={selectedUser.email}
                onChange={e => setSelectedUser({...selectedUser, email: e.target.value})}
            />

            <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                <Input 
                    label="Senha"
                    type="text" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nova senha (deixe em branco para manter)"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <select 
                    value={selectedUser.roleId} 
                    onChange={(e) => setSelectedUser({...selectedUser, roleId: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm border p-2"
                  >
                    {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                    <select 
                        value={selectedUser.classId || ''} 
                        onChange={(e) => setSelectedUser({...selectedUser, classId: e.target.value})}
                        className="block w-full border-gray-300 rounded-md shadow-sm border p-2"
                    >
                        <option value="">Sem Turma</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="border p-4 rounded bg-gray-50">
                <label className="block text-sm font-bold text-gray-800 mb-2">Estado da Conta</label>
                <select 
                    value={selectedUser.status}
                    onChange={(e) => setSelectedUser({...selectedUser, status: e.target.value as UserStatus})}
                    className="block w-full border-gray-300 rounded-md shadow-sm border p-2"
                >
                    <option value={UserStatus.ACTIVE}>Ativo</option>
                    <option value={UserStatus.PENDING}>Pendente</option>
                    <option value={UserStatus.BLOCKED}>Bloqueado</option>
                </select>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        title="Importar Utilizadores em Massa"
        footer={
            <>
                <Button variant="ghost" onClick={() => setIsBulkAddOpen(false)}>Cancelar</Button>
                <Button variant="primary" onClick={handleBulkAdd}>Importar</Button>
            </>
        }
      >
         <div className="space-y-4">
              <p className="text-sm text-gray-600">
                  Adicione um utilizador por linha no formato: <code>Nome; Email</code>.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <select 
                    value={bulkRoleId} 
                    onChange={(e) => setBulkRoleId(e.target.value)}
                    className="block w-full border-gray-300 rounded-md shadow-sm border p-2"
                  >
                     <option value="">Selecione...</option>
                    {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                    <select 
                        value={bulkClassId} 
                        onChange={(e) => setBulkClassId(e.target.value)}
                        className="block w-full border-gray-300 rounded-md shadow-sm border p-2"
                    >
                        <option value="">Sem Turma</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

              <textarea 
                  className="w-full h-48 p-3 border border-gray-300 rounded-md font-mono text-sm"
                  placeholder={`João Silva; joao@email.com\nMaria Santos; maria@email.com`}
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
              />
          </div>
      </Modal>
    </div>
  );
}