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
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Bulk Add State
  const [bulkText, setBulkText] = useState('');
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkRoleId, setBulkRoleId] = useState('');
  
  // State for password management in modal
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setUsers(storageService.getUsers());
    setCourses(storageService.getCourses());
    setClasses(storageService.getClasses());
    setRoles(storageService.getRoles());
  };

  // --- CRUD Operations ---

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
          role: UserRole.ALUNO, // Fallback legacy
          roleId: roles.find(r => r.name === 'Aluno')?.id || roles[0]?.id || '',
          status: UserStatus.ACTIVE,
          allowedCourses: [],
          avatarUrl: 'https://via.placeholder.com/100',
          mustChangePassword: true,
          classId: ''
      });
      setNewPassword('123456'); 
      setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    let userToSave = { ...selectedUser };
    if (newPassword) {
        userToSave.password = newPassword;
        userToSave.mustChangePassword = true; 
    }
    
    // Sync Legacy Enum for compatibility
    const selectedRoleObj = roles.find(r => r.id === userToSave.roleId);
    if (selectedRoleObj) {
        if (selectedRoleObj.name.toLowerCase().includes('admin')) userToSave.role = UserRole.ADMIN;
        else if (selectedRoleObj.name.toLowerCase().includes('formador')) userToSave.role = UserRole.EDITOR;
        else userToSave.role = UserRole.ALUNO;
    }

    const exists = users.find(u => u.id === userToSave.id);
    let updatedUsers = [...users];

    if (exists) {
        updatedUsers = users.map(u => u.id === userToSave.id ? userToSave : u);
        storageService.saveUsers(updatedUsers);
        setUsers(updatedUsers);
        setIsModalOpen(false);
        // alert("Utilizador atualizado com sucesso.");
    } else {
        if (!userToSave.email || !newPassword) {
            alert("Nome, Email e Senha são obrigatórios para novos utilizadores.");
            return;
        }
        updatedUsers.push(userToSave);
        storageService.saveUsers(updatedUsers);
        setUsers(updatedUsers);
        setIsModalOpen(false);

        // Send Welcome Email
        if (storageService.getEmailConfig()) {
            setIsSendingEmail(true);
            await emailService.sendWelcomeEmail(userToSave.name, userToSave.email, newPassword);
            setIsSendingEmail(false);
            alert(`Utilizador criado e notificado.`);
        }
    }
  };

  // --- Bulk Actions ---

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) setSelectedIds([]);
    else setSelectedIds(users.map(u => u.id));
  };

  const toggleSelectUser = (id: string) => {
      if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(sid => sid !== id));
      else setSelectedIds([...selectedIds, id]);
  };

  const handleBulkDelete = () => {
      if(selectedIds.length === 0) return;
      if(confirm(`Tem a certeza que deseja apagar ${selectedIds.length} utilizadores?`)) {
          const updated = users.filter(u => !selectedIds.includes(u.id));
          storageService.saveUsers(updated);
          setUsers(updated);
          setSelectedIds([]);
      }
  };

  const handleBulkAdd = () => {
      if(!bulkText) return;
      
      const lines = bulkText.split('\n').filter(line => line.trim().length > 0);
      const newUsers: User[] = [];
      const roleToAssign = roles.find(r => r.id === bulkRoleId);
      const legacyRole = roleToAssign?.name.toLowerCase().includes('admin') ? UserRole.ADMIN : 
                         roleToAssign?.name.toLowerCase().includes('formador') ? UserRole.EDITOR : UserRole.ALUNO;

      lines.forEach((line, idx) => {
          // Format: Name; Email
          const parts = line.split(/[;,]/); // Allow ; or ,
          if(parts.length >= 2) {
              const name = parts[0].trim();
              const email = parts[1].trim();
              const password = '123456'; // Default
              
              if(email.includes('@')) {
                  newUsers.push({
                      id: Date.now().toString() + idx,
                      name,
                      email,
                      password,
                      role: legacyRole,
                      roleId: bulkRoleId,
                      classId: bulkClassId || undefined,
                      status: UserStatus.ACTIVE,
                      allowedCourses: [],
                      mustChangePassword: true,
                      avatarUrl: `https://ui-avatars.com/api/?name=${name}&background=random`
                  });
              }
          }
      });

      if(newUsers.length > 0) {
          const updated = [...users, ...newUsers];
          storageService.saveUsers(updated);
          setUsers(updated);
          setIsBulkAddOpen(false);
          setBulkText('');
          alert(`${newUsers.length} utilizadores adicionados.`);
      } else {
          alert("Nenhum utilizador válido encontrado. Use o formato: Nome; Email");
      }
  };

  // --- Helpers ---

  const toggleStatus = () => {
      if(!selectedUser) return;
      const newStatus = selectedUser.status === UserStatus.ACTIVE ? UserStatus.BLOCKED : UserStatus.ACTIVE;
      setSelectedUser({...selectedUser, status: newStatus});
  };
  
  const approveUser = (user: User) => {
      const updated = {...user, status: UserStatus.ACTIVE};
      const updatedUsers = users.map(u => u.id === user.id ? updated : u);
      storageService.saveUsers(updatedUsers);
      setUsers(updatedUsers);
  }

  const getClassName = (id?: string) => {
      if(!id) return '-';
      return classes.find(c => c.id === id)?.name || 'Turma desconhecida';
  };
  
  const getRoleName = (id: string) => {
      return roles.find(r => r.id === id)?.name || 'Cargo desconhecido';
  }

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
                      {user.status}
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

      {/* Edit/Create User Modal */}
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
                    label={users.find(u => u.id === selectedUser.id) ? "Redefinir Senha (Opcional)" : "Senha Inicial"}
                    type="text" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a atual"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <select 
                    value={selectedUser.roleId} 
                    onChange={(e) => setSelectedUser({...selectedUser, roleId: e.target.value})}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2"
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
                        className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Sem Turma</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <div className="flex items-center gap-2">
                    <Badge color={selectedUser.status === UserStatus.ACTIVE ? 'success' : 'danger'}>{selectedUser.status}</Badge>
                    <button onClick={toggleStatus} className="text-xs text-indigo-600 hover:underline">
                        {selectedUser.status === UserStatus.ACTIVE ? 'Bloquear' : 'Ativar'}
                    </button>
                </div>
            </div>

            {/* Course Override (Optional access control separate from Role) */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cursos Permitidos (Específico)</label>
                <div className="space-y-2 border rounded-md p-3 max-h-32 overflow-y-auto bg-gray-50">
                  {courses.map(course => (
                    <div key={course.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUser.allowedCourses.includes(course.id)}
                        onChange={() => {
                            const current = selectedUser.allowedCourses;
                            const newVal = current.includes(course.id) ? current.filter(id => id !== course.id) : [...current, course.id];
                            setSelectedUser({...selectedUser, allowedCourses: newVal});
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        {course.title}
                      </label>
                    </div>
                  ))}
                </div>
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
                  Adicione um utilizador por linha no formato: <code>Nome; Email</code> ou <code>Nome, Email</code>.
                  A senha padrão será "123456".
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo a Atribuir</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma a Atribuir</label>
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