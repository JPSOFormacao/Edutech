import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { User, UserRole, UserStatus } from './types';
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
import { Icons } from './components/Icons';
import { Input, Button } from './components/UI';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  login: (email: string, password?: string) => void;
  logout: () => void;
  refreshUser: () => void;
  updatePassword: (password: string) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

// --- Layout Component ---
const Layout = () => {
  const { user, logout, updatePassword } = useAuth();
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
          <button onClick={logout} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200">
            <Icons.Logout className="w-4 h-4 mr-2" />
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} onLogout={logout} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen fade-in">
        <Outlet />
      </main>
    </div>
  );
};

// --- App Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(storageService.getCurrentUser());

  const login = (email: string, password?: string) => {
    const loggedUser = storageService.login(email, password);
    setUser(loggedUser);
  };

  const logout = () => {
    storageService.logout();
    setUser(null);
  };

  const refreshUser = () => {
    // Reload user from storage in case permissions changed
    const current = storageService.getCurrentUser();
    if (current) setUser(current);
  };
  
  const updatePassword = (pass: string) => {
      if (user) {
          const updated = storageService.updatePassword(user.id, pass);
          if (updated) setUser(updated);
      }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, updatePassword }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/p/:slug" element={<PageViewer />} />
            
            {/* Protected Routes */}
            <Route path="/users" element={
              user?.role === UserRole.ADMIN ? <UsersPage /> : <Navigate to="/" />
            } />
            <Route path="/cms" element={
              (user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR) ? <CMS /> : <Navigate to="/" />
            } />
             <Route path="/ai-studio" element={
              (user?.role === UserRole.ADMIN || user?.role === UserRole.EDITOR) ? <AIStudio /> : <Navigate to="/" />
            } />
            <Route path="/email-config" element={
              (user?.role === UserRole.ADMIN) ? <EmailConfigPage /> : <Navigate to="/" />
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}