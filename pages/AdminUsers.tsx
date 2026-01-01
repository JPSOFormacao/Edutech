import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { emailService } from '../services/emailService';
import { User, UserRole, UserStatus, Course, ClassEntity, RoleEntity, EnrollmentRequest } from '../types';
import { Badge, Button, Modal, Input } from '../components/UI';
import { Icons } from '../components/Icons';
import { useAuth } from '../App';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [roles, setRoles] = useState<RoleEntity[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');

  // Tabs: 'staff' (Admin/Editor) or 'students' (Aluno)
  const [activeTab, setActiveTab] = useState<'staff' | 'students'>('staff');

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

  const hasPendingRequests = (user: User) => {
      return user.enrollmentRequests && user.enrollmentRequests.some(r => r.status === 'PENDING');
  };

  // --- Filter Logic for Tabs ---
  const filteredUsers = React.useMemo(() => {
      if (activeTab === 'staff') {
          // Filtra Admins e Editores, ordenados por: Admin primeiro
          return users
            .filter(u => u.role === UserRole.ADMIN || u.role === UserRole.EDITOR)
            .sort((a, b) => {
                if (a.role === UserRole.ADMIN && b.role !== UserRole.ADMIN) return -1;
                if (a.role !== UserRole.ADMIN && b.role === UserRole.ADMIN) return 1;
                return a.name.localeCompare(b.name);
            });
      } else {
          // Filtra Alunos
          // Ordenação: Pendentes de Atenção primeiro, depois alfabético
          return users
            .filter(u => u.role === UserRole.ALUNO)
            .sort((a, b) => {
                const aNeedsAttention = a.status === UserStatus.PENDING || hasPendingRequests(a);
                const bNeedsAttention = b.status === UserStatus.PENDING || hasPendingRequests(b);
                
                if (aNeedsAttention && !bNeedsAttention) return -1;
                if (!aNeedsAttention && bNeedsAttention) return 1;
                
                return a.name.localeCompare(b.name);
            });
      }
  }, [users, activeTab]);

  // --- Actions ---

  const handleEdit = (user: User) => {
    setSelectedUser({ ...user }); 
    setNewPassword(''); 
    setIsModalOpen(true);
  };

  const handleCreate = () => {
      // Define default role based on current tab
      const defaultRoleName = activeTab === 'staff' ? 'Formador' : 'Aluno';
      const defaultRoleObj = roles.find(r => r.name === defaultRoleName) || roles.find(r => r.name === 'Aluno');
      const defaultRoleEnum = activeTab === 'staff' ? UserRole.EDITOR : UserRole.ALUNO;

      setSelectedUser({
          id: Date.now().toString(),
          name: '',
          email: '',
          role: defaultRoleEnum, 
          roleId: defaultRoleObj?.id || '',
          status: UserStatus.ACTIVE,
          allowedCourses: [],
          enrollmentRequests: [],
          avatarUrl: 'https://via.placeholder.com/100',
          mustChangePassword: true,
          classId: ''
      });
      setNewPassword(generateRandomPassword()); 
      setIsModalOpen(true);
  };

  const handleDelete = async (userId: string) => {
      if (userId === currentUser?.id) {
          alert("Não pode apagar a sua própria conta.");
          return;
      }
      
      if (confirm("Tem a certeza que deseja eliminar este utilizador permanentemente?")) {
          try {
              await storageService.deleteUser(userId);
              setUsers(users.filter(u => u.id !== userId));
              setSelectedIds(selectedIds.filter(id => id !== userId));
          } catch (e) {
              alert("Erro ao eliminar utilizador.");
          }
      }
  };

  const handleBulkDelete = async () => {
      if (selectedIds.length === 0) return;
      
      if (confirm(`Tem a certeza que deseja eliminar ${selectedIds.length} utilizadores?`)) {
          setLoading(true);
          try {
              const idsToDelete = selectedIds.filter(id => id !== currentUser?.id);
              
              if (idsToDelete.length !== selectedIds.length) {
                  alert("A sua própria conta foi removida da seleção de eliminação.");
              }

              for (const id of idsToDelete) {
                  await storageService.deleteUser(id);
              }
              await loadData();
              setSelectedIds([]);
          } catch (e) {
              alert("Erro durante a eliminação em massa.");
              setLoading(false);
          }
      }
  };

  // --- Selection Logic ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(filteredUsers.map(u => u.id));
      } else {
          setSelectedIds([]);
      }
  };

  const handleSelectOne = (id: string) => {
      if (selectedIds.includes(id)) {
          setSelectedIds(selectedIds.filter(curr => curr !== id));
      } else {
          setSelectedIds([...selectedIds, id]);
      }
  };

  // --- Send Verification Email Manually ---
  const handleSendVerification = async (u: User) => {
      if (!u.email) return;
      if (isSendingEmail) return;

      if (!confirm(`Deseja enviar o email de verificação para ${u.email}?`)) return;

      setIsSendingEmail(true);

      try {
          // Garantir que existe token
          let token = u.verificationToken;
          if (!token) {
              token = Math.random().toString(36).substring(2) + Date.now().toString(36);
              const updated = { ...u, verificationToken: token };
              // Salvar token na BD se não existir
              await storageService.saveUser(updated);
          }

          const link = `${window.location.origin}/#/verify-email?token=${token}`;
          const res = await emailService.sendVerificationEmail(u.name, u.email, link);

          if (res.success) {
              alert("Email de verificação enviado com sucesso!");
          } else {
              alert("Erro ao enviar email: " + res.message);
          }
      } catch (e: any) {
          alert("Erro: " + e.message);
      } finally {
          setIsSendingEmail(false);
      }
  };

  // --- Save Logic ---

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
    
    // Sync Legacy Enum & Role ID
    const selectedRoleObj = roles.find(r => r.id === userToSave.roleId);
    if (selectedRoleObj) {
        if (selectedRoleObj.name.toLowerCase().includes('admin')) userToSave.role = UserRole.ADMIN;
        else if (selectedRoleObj.name.toLowerCase().includes('formador')) userToSave.role = UserRole.EDITOR;
        else userToSave.role = UserRole.ALUNO;
    }

    const exists = currentUsers.find(u => u.id === userToSave.id);

    if (exists) {
        // UPDATE
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

  // Funções de Aprovação de Cursos
  const handleApproveCourse = (courseId: string) => {
      if(!selectedUser) return;
      const updatedAllowed = [...selectedUser.allowedCourses];
      if(!updatedAllowed.includes(courseId)) {
          updatedAllowed.push(courseId);
      }
      
      const updatedRequests = selectedUser.enrollmentRequests?.map(r => 
          r.courseId === courseId ? { ...r, status: 'APPROVED' } : r
      ) as EnrollmentRequest[];

      setSelectedUser({
          ...selectedUser,
          allowedCourses: updatedAllowed,
          enrollmentRequests: updatedRequests
      });
  };

  const handleRejectCourse = (courseId: string) => {
    if(!selectedUser) return;
    const updatedRequests = selectedUser.enrollmentRequests?.map(r => 
        r.courseId === courseId ? { ...r, status: 'REJECTED' } : r
    ) as EnrollmentRequest[];

    setSelectedUser({
        ...selectedUser,
        enrollmentRequests: updatedRequests
    });
  };

  const approveUser = async (user: User) => {
      setIsSendingEmail(true); // Bloquear UI
      try {
          const generatedPass = generateRandomPassword();
          const updated = {
              ...user, 
              status: UserStatus.ACTIVE,
              password: generatedPass,
              mustChangePassword: true // Obrigatório mudar no 1º login
          };
          
          await storageService.saveUser(updated);
          
          // Enviar Email de Boas-vindas com a nova senha
          const config = await storageService.getEmailConfig();
          if (config) {
             const res = await emailService.sendWelcomeEmail(
                 updated.name, 
                 updated.email, 
                 generatedPass, 
                 updated.classId, 
                 updated.allowedCourses
             );
             if(!res.success) {
                 alert("Aviso: Utilizador aprovado, mas falha ao enviar email: " + res.message);
             } else {
                 alert("Utilizador aprovado e email enviado com sucesso.");
             }
          } else {
              alert("Utilizador aprovado. Aviso: Email não configurado, envie a senha manualmente.");
          }

          await loadData();
      } catch (e) {
          console.error(e);
          alert("Erro ao aprovar utilizador.");
      } finally {
          setIsSendingEmail(false);
      }
  }

  const getClassName = (id?: string) => classes.find(c => c.id === id)?.name || '-';
  const getRoleName = (id: string) => roles.find(r => r.id === id)?.name || 'Cargo desconhecido';

  if (loading) return <div className="p-10 text-center">A carregar dados do Supabase...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Gestão de Utilizadores</h2>
        <div className="flex gap-2">
            <Button onClick={handleCreate} icon={Icons.Plus}>Novo Utilizador</Button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
              <button
                  onClick={() => { setActiveTab('staff'); setSelectedIds([]); }}
                  className={`${
                      activeTab === 'staff'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                  <Icons.Shield className="w-4 h-4" />
                  Equipa & Gestão
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs ml-2">
                      {users.filter(u => u.role === UserRole.ADMIN || u.role === UserRole.EDITOR).length}
                  </span>
              </button>

              <button
                  onClick={() => { setActiveTab('students'); setSelectedIds([]); }}
                  className={`${
                      activeTab === 'students'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
              >
                  <Icons.Student className="w-4 h-4" />
                  Alunos
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs ml-2">
                      {users.filter(u => u.role === UserRole.ALUNO).length}
                  </span>
              </button>
          </nav>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex justify-between items-center animate-pulse">
              <span className="text-sm font-medium text-indigo-800 ml-2">
                  {selectedIds.length} utilizador(es) selecionado(s)
              </span>
              <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={handleBulkDelete} icon={Icons.Delete}>
                      Apagar Selecionados
                  </Button>
              </div>
          </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left w-10">
                    <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        checked={filteredUsers.length > 0 && selectedIds.length === filteredUsers.length}
                        onChange={handleSelectAll}
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
              {filteredUsers.length === 0 ? (
                  <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                          Nenhum utilizador encontrado nesta categoria.
                      </td>
                  </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const pending = hasPendingRequests(user);
                  const isPendingAccount = user.status === UserStatus.PENDING;
                  const needsAttention = pending || isPendingAccount;
                  const isSelected = selectedIds.includes(user.id);
                  
                  // Lógica de Cor: Selecionado > Atenção > Zebra
                  let rowClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  if (needsAttention) rowClass = 'bg-amber-50';
                  if (isSelected) rowClass = 'bg-indigo-50';
                  
                  return (
                    <tr key={user.id} className={rowClass}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                            checked={isSelected}
                            onChange={() => handleSelectOne(user.id)}
                        />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 relative">
                            <img className="h-10 w-10 rounded-full" src={user.avatarUrl} alt="" />
                            {pending && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[8px] text-white items-center justify-center">!</span>
                                </span>
                            )}
                        </div>
                        <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                {user.email}
                                {user.emailVerified ? (
                                    <span title="Email Verificado"><Icons.Check className="w-3 h-3 text-green-500" /></span>
                                ) : (
                                    <span title="Email Não Verificado" className="text-xs text-orange-500 flex items-center bg-orange-50 px-1 rounded border border-orange-200">
                                        Não verificado
                                    </span>
                                )}
                            </div>
                        </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-800' : 
                              user.role === UserRole.EDITOR ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
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
                        <div className="flex items-center justify-end gap-2">
                            {/* Botão de Enviar Verificação Manual */}
                            {!user.emailVerified && (
                                <button 
                                    onClick={() => handleSendVerification(user)} 
                                    className="text-orange-600 hover:text-orange-900 flex items-center gap-1 p-2 hover:bg-orange-50 rounded-full" 
                                    title="Enviar Email de Verificação"
                                    disabled={isSendingEmail}
                                >
                                    <Icons.Mail className="w-5 h-5" />
                                </button>
                            )}

                            {user.status === UserStatus.PENDING && (
                                <Button variant="primary" size="sm" onClick={() => approveUser(user)} disabled={isSendingEmail}>
                                    Aprovar
                                </Button>
                            )}
                            <button onClick={() => handleEdit(user)} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 p-2 hover:bg-gray-100 rounded-full" title="Editar">
                                {pending && <span className="text-xs text-red-500 font-bold mr-1">!</span>}
                                <Icons.Edit className="w-5 h-5" />
                            </button>
                            <button onClick={() => handleDelete(user.id)} className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full" title="Apagar">
                                <Icons.Delete className="w-5 h-5" />
                            </button>
                        </div>
                    </td>
                    </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
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
          <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
            {/* Secção de Pedidos Pendentes */}
            {selectedUser.enrollmentRequests && selectedUser.enrollmentRequests.filter(r => r.status === 'PENDING').length > 0 && (
                <div className="bg-orange-50 p-4 rounded border border-orange-200 mb-4">
                    <h4 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                        <Icons.Check className="w-4 h-4" /> Pedidos de Inscrição em Cursos
                    </h4>
                    <ul className="space-y-2">
                        {selectedUser.enrollmentRequests.filter(r => r.status === 'PENDING').map(req => {
                            const c = courses.find(c => c.id === req.courseId);
                            return (
                                <li key={req.courseId} className="flex justify-between items-center bg-white p-2 rounded shadow-sm">
                                    <span className="text-sm font-medium">{c?.title || req.courseId}</span>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => handleApproveCourse(req.courseId)}
                                            className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                                        >
                                            Aprovar
                                        </button>
                                        <button 
                                            onClick={() => handleRejectCourse(req.courseId)}
                                            className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                                        >
                                            Rejeitar
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

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

            {/* Manual Course Override */}
            <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Cursos Atribuídos (Manual)</label>
                 <div className="border rounded-md p-2 h-32 overflow-y-auto space-y-1">
                     {courses.map(c => (
                         <label key={c.id} className="flex items-center space-x-2 text-sm">
                             <input 
                                type="checkbox"
                                checked={selectedUser.allowedCourses.includes(c.id)}
                                onChange={(e) => {
                                    if(e.target.checked) {
                                        setSelectedUser({...selectedUser, allowedCourses: [...selectedUser.allowedCourses, c.id]});
                                    } else {
                                        setSelectedUser({...selectedUser, allowedCourses: selectedUser.allowedCourses.filter(id => id !== c.id)});
                                    }
                                }}
                             />
                             <span>{c.title}</span>
                         </label>
                     ))}
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
                <div className="mt-2">
                     <label className="flex items-center text-sm text-gray-700">
                         <input 
                            type="checkbox"
                            checked={!!selectedUser.emailVerified}
                            onChange={e => setSelectedUser({...selectedUser, emailVerified: e.target.checked})}
                            className="mr-2"
                         />
                         Email Verificado
                     </label>
                </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}