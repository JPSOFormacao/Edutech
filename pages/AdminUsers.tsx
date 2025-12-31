import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { User, UserRole, UserStatus, Course } from '../types';
import { Badge, Button, Modal, Input } from '../components/UI';
import { Icons } from '../components/Icons';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for password management in modal
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setUsers(storageService.getUsers());
    setCourses(storageService.getCourses());
  };

  const handleEdit = (user: User) => {
    setSelectedUser({ ...user }); // Clone
    setNewPassword(''); // Reset password field
    setIsModalOpen(true);
  };

  const handleCreate = () => {
      setSelectedUser({
          id: Date.now().toString(),
          name: '',
          email: '',
          role: UserRole.ALUNO,
          status: UserStatus.ACTIVE,
          allowedCourses: [],
          avatarUrl: 'https://via.placeholder.com/100',
          mustChangePassword: true
      });
      setNewPassword('123456'); // Default for new users
      setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedUser) return;
    
    // Check if updating password
    let userToSave = { ...selectedUser };
    if (newPassword) {
        userToSave.password = newPassword;
        // If admin changes password, force user to change it next time, 
        // unless it's the admin updating their own password (optional logic, keeping simple here)
        userToSave.mustChangePassword = true; 
    }

    const exists = users.find(u => u.id === userToSave.id);
    let updatedUsers = [...users];

    if (exists) {
        updatedUsers = users.map(u => u.id === userToSave.id ? userToSave : u);
    } else {
        if (!userToSave.email || !newPassword) {
            alert("Nome, Email e Senha são obrigatórios para novos utilizadores.");
            return;
        }
        updatedUsers.push(userToSave);
    }

    storageService.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    setIsModalOpen(false);
  };

  const toggleCourseAccess = (courseId: string) => {
    if (!selectedUser) return;
    const currentAccess = selectedUser.allowedCourses || [];
    const newAccess = currentAccess.includes(courseId)
      ? currentAccess.filter(id => id !== courseId)
      : [...currentAccess, courseId];
    
    setSelectedUser({ ...selectedUser, allowedCourses: newAccess });
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Utilizadores</h2>
        <Button onClick={handleCreate} icon={Icons.Plus}>Novo Utilizador</Button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilizador</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user, idx) => (
                <tr key={user.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                    <span className="text-sm text-gray-900 capitalize">{user.role}</span>
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
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>Guardar</Button>
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
                    type="text" // Visible text so admin knows what they are setting
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Deixe em branco para manter a atual"
                />
                <p className="text-xs text-yellow-700 mt-1">
                    * Ao definir uma nova senha, o utilizador será obrigado a alterá-la no próximo login.
                </p>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
              <select 
                value={selectedUser.role} 
                onChange={(e) => setSelectedUser({...selectedUser, role: e.target.value as UserRole})}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm border p-2"
              >
                <option value={UserRole.ADMIN}>Administrador</option>
                <option value={UserRole.EDITOR}>Editor Formador</option>
                <option value={UserRole.ALUNO}>Aluno</option>
              </select>
            </div>

            {selectedUser.role === UserRole.ALUNO && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cursos Permitidos</label>
                <div className="space-y-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                  {courses.map(course => (
                    <div key={course.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedUser.allowedCourses.includes(course.id)}
                        onChange={() => toggleCourseAccess(course.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900">
                        {course.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}