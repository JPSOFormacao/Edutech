import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { User, UserRole, UserStatus, PERMISSIONS } from './types';
import { storageService } from './services/storageService';
import { Sidebar } from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import UsersPage from './pages/AdminUsers';
import Materials from './pages/Materials';
import CMS from './pages/CMS';
import AIStudio from './pages/AIStudio';
import PageViewer from './pages/PageViewer';
import EmailConfigPage from './pages/EmailConfig';
import ClassesPage from './pages/Classes'; // New
import RolesPage from './pages/Roles'; // New
import { Icons } from './components/Icons';
import { Input, Button } from './components/UI';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  permissions: string[];
  login: (email: string, password?: string) => void;
  logout: () => void;
  refreshUser: () => void;
  updatePassword: (password: string) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

// --- Layout Component ---
const Layout = () => {
  const { user, logout, updatePassword, hasPermission, refreshUser } = useAuth();
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  if (!user) return <Navigate to="/login" />;
  
  // Force Password Change Screen
  if (user.mustChangePassword) {
      const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if (newPass.length < 4) {
              setError("A senha deve ter pelo menos 4 caracteres.");
              return;
          }
          if (newPass !== confirmPass) {
              setError("As senhas não coincidem.");
              return;
          }
          updatePassword(newPass);
      };

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                    <Icons.Settings className="h-6 w-6 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Alteração de Senha</h2>
                <p className="text-gray-600 text-center mb-6 text-sm">
                    É o seu primeiro acesso ou a sua senha expirou. Por favor, defina uma nova senha para continuar.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
                    
                    <Input 
                        label="Nova Senha"
                        type="password"
                        value={newPass}
                        onChange={e => setNewPass(e.target.value)}
                        required
                    />
                    <Input 
                        label="Confirmar Senha"
                        type="password"
                        value={confirmPass}
                        onChange={e => setConfirmPass(e.target.value)}
                        required
                    />
                    
                    <Button type="submit" className="w-full">Atualizar Senha</Button>
                    <div className="text-center mt-4">
                         <button type="button" onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">
                             Voltar ao Login
                         </button>
                    </div>
                </form>
            </div>
        </div>
      );
  }

  // Pending users block
  if (user.status === UserStatus.PENDING) {
    // Auto-refresh poll: check status every 3 seconds
    React.useEffect(() => {
        const interval = setInterval(() => {
            refreshUser();
        }, 3000);
        return () => clearInterval(interval);
    }, [refreshUser]);

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
            <Icons.Student className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta Pendente</h2>
          <p className="text-gray-600 mb-8">
            A sua conta aguarda aprovação de um Administrador. <br/>
            Por favor, contacte a secretaria ou aguarde a ativação.
          </p>
          <div className="flex flex-col gap-3">
             <div className="text-xs text-gray-400 mb-2 flex items-center justify-center">
                 <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                 Verificando aprovação automaticamente...
             </div>
            <Button onClick={refreshUser} variant="primary">
                Verificar Agora Manualmente
            </Button>
            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 mt-2">
                <div className="flex items-center justify-center">
                    <Icons.Logout className="w-4 h-4 mr-2" />
                    Voltar ao Login
                </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} onLogout={logout} hasPermission={hasPermission} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen fade-in">
        <Outlet />
      </main>
    </div>
  );
};

// --- App Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(storageService.getCurrentUser());
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
        setPermissions(storageService.getUserPermissions(user));
    } else {
        setPermissions([]);
    }
  }, [user]);

  const login = (email: string, password?: string) => {
    const loggedUser = storageService.login(email, password);
    setUser(loggedUser);
  };

  const logout = () => {
    storageService.logout();
    setUser(null);
  };

  const refreshUser = () => {
    const current = storageService.getCurrentUser();
    if (current) setUser(current);
  };
  
  const updatePassword = (pass: string) => {
      if (user) {
          const updated = storageService.updatePassword(user.id, pass);
          if (updated) setUser(updated);
      }
  }

  const hasPermission = (permission: string) => {
      return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, refreshUser, updatePassword, hasPermission }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/courses" element={
                hasPermission(PERMISSIONS.VIEW_COURSES) ? <Courses /> : <Navigate to="/" />
            } />
            
            <Route path="/materials" element={<Materials />} />
            <Route path="/p/:slug" element={<PageViewer />} />
            
            {/* Protected Routes based on Permissions */}
            <Route path="/users" element={
              hasPermission(PERMISSIONS.MANAGE_USERS) ? <UsersPage /> : <Navigate to="/" />
            } />
             <Route path="/classes" element={
              hasPermission(PERMISSIONS.MANAGE_CLASSES) ? <ClassesPage /> : <Navigate to="/" />
            } />
             <Route path="/roles" element={
              hasPermission(PERMISSIONS.MANAGE_ROLES) ? <RolesPage /> : <Navigate to="/" />
            } />

            <Route path="/cms" element={
              hasPermission(PERMISSIONS.MANAGE_CONTENT) ? <CMS /> : <Navigate to="/" />
            } />
             <Route path="/ai-studio" element={
              hasPermission(PERMISSIONS.USE_AI_STUDIO) ? <AIStudio /> : <Navigate to="/" />
            } />
            <Route path="/email-config" element={
              hasPermission(PERMISSIONS.MANAGE_SETTINGS) ? <EmailConfigPage /> : <Navigate to="/" />
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}