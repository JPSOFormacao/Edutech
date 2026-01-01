import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { User, UserRole, UserStatus, PERMISSIONS, SystemConfig } from './types';
import { storageService } from './services/storageService';
import { Sidebar } from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import UsersPage from './pages/AdminUsers';
import Materials from './pages/Materials';
import MaterialEditor from './pages/MaterialEditor'; // Nova Importação
import CMS from './pages/CMS';
import AIStudio from './pages/AIStudio';
import PageViewer from './pages/PageViewer';
import EmailConfigPage from './pages/EmailConfig';
import ClassesPage from './pages/Classes'; 
import RolesPage from './pages/Roles';
import ProfilePage from './pages/Profile';
import CommunityPage from './pages/Community';
import CatalogPage from './pages/Catalog';
import VerifyEmail from './pages/VerifyEmail';
import SystemSettings from './pages/SystemSettings'; 
import DatabaseTest from './pages/DatabaseTest'; 
import IntegrationsPage from './pages/Integrations'; 
import { Icons } from './components/Icons';
import { Input, Button } from './components/UI';

// --- Auth Context ---
interface AuthContextType {
  user: User | null;
  permissions: string[];
  systemConfig: SystemConfig | null; 
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshSystemConfig: () => Promise<void>; 
  updatePassword: (password: string) => void;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const useAuth = () => useContext(AuthContext);

// --- Layout Component ---
const Layout = () => {
  const { user, logout, updatePassword, hasPermission, refreshUser, systemConfig } = useAuth();
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  
  // States for toggle password visibility
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

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
                    
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                        <div className="relative">
                            <input
                                type={showNewPass ? "text" : "password"}
                                value={newPass}
                                onChange={e => setNewPass(e.target.value)}
                                required
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border pr-10"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                onClick={() => setShowNewPass(!showNewPass)}
                            >
                                {showNewPass ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                        <div className="relative">
                            <input
                                type={showConfirmPass ? "text" : "password"}
                                value={confirmPass}
                                onChange={e => setConfirmPass(e.target.value)}
                                required
                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border pr-10"
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                            >
                                {showConfirmPass ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    
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
    // eslint-disable-next-line react-hooks/rules-of-hooks
    React.useEffect(() => {
        const interval = setInterval(() => {
            handleRefresh();
        }, 5000); // Polling slower for remote DB
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        setIsVerifying(true);
        refreshUser();
        setTimeout(() => setIsVerifying(false), 800);
    };

    const handleHardReload = () => {
        window.location.reload();
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8 text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
            <Icons.Student className="h-8 w-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta Pendente</h2>
          <p className="text-gray-600 mb-6">
            A sua conta aguarda aprovação de um Administrador. <br/>
            {!user.emailVerified && <span className="block mt-2 font-bold text-orange-600">O seu email ainda não foi verificado. Verifique a sua caixa de entrada.</span>}
          </p>
          
          <div className="flex flex-col gap-3">
             {isVerifying && (
                 <div className="text-xs text-indigo-600 mb-1 flex items-center justify-center font-semibold">
                     <span className="w-2 h-2 bg-indigo-600 rounded-full mr-2 animate-ping"></span>
                     Verificando estado...
                 </div>
             )}
             
            <Button onClick={handleRefresh} variant="primary" disabled={isVerifying}>
                {isVerifying ? 'A Verificar...' : 'Verificar Agora'}
            </Button>
            
            <Button onClick={handleHardReload} variant="secondary" className="mt-2">
                Recarregar Aplicação
            </Button>

            <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700 mt-4 border-t pt-4">
                <div className="flex items-center justify-center">
                    <Icons.Logout className="w-4 h-4 mr-2" />
                    Voltar ao Login
                </div>
            </button>
            
            <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 text-left">
                <p>ID: {user.id}</p>
                <p>Email: {user.email}</p>
                <p>Verificado: {user.emailVerified ? 'Sim' : 'Não'}</p>
                <p>Status: {user.status}</p>
                <p className="italic text-gray-300">Backend: Supabase</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pass systemConfig to Sidebar to update Logo dynamically
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar user={user} onLogout={logout} hasPermission={hasPermission} systemConfig={systemConfig} />
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
  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  useEffect(() => {
    const init = async () => {
        // Tentativa de seed se a DB estiver vazia
        try {
            await storageService.checkAndSeedData();
        } catch(e) {
            console.warn("Erro ao verificar Seed:", e);
        }

        await refreshSystemConfig(); // Carregar config de branding

        if (user) {
            // Validate session and get perms
            const freshUser = await storageService.refreshSession();
            if (freshUser) {
                 setUser(freshUser);
                 const perms = await storageService.getUserPermissions(freshUser);
                 setPermissions(perms);
            } else {
                 // Invalid session
                 setUser(null);
                 setPermissions([]);
            }
        } else {
            setPermissions([]);
        }
    };
    init();
  }, []); // Run once on mount

  // Watch for user changes to update permissions
  useEffect(() => {
      const updatePerms = async () => {
          if (user) {
              const perms = await storageService.getUserPermissions(user);
              setPermissions(perms);
          }
      };
      updatePerms();
  }, [user?.id, user?.roleId]); // Re-fetch if role changes

  // Atualizar DOM (Favicon e Title) quando systemConfig muda
  useEffect(() => {
      if (systemConfig) {
          if (systemConfig.platformName) {
              document.title = `${systemConfig.platformName} - Gestão de Formação`;
          }
          if (systemConfig.faviconUrl) {
              const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
              if (link) {
                  link.href = systemConfig.faviconUrl;
              } else {
                  // Fallback se não existir
                  const newLink = document.createElement('link');
                  newLink.rel = 'icon';
                  newLink.href = systemConfig.faviconUrl;
                  document.head.appendChild(newLink);
              }
          }
      }
  }, [systemConfig]);

  const login = async (email: string, password?: string) => {
    const loggedUser = await storageService.login(email, password);
    setUser(loggedUser);
    const perms = await storageService.getUserPermissions(loggedUser);
    setPermissions(perms);
  };

  const logout = () => {
    storageService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const current = await storageService.refreshSession();
    if (current) {
        setUser({ ...current });
        const perms = await storageService.getUserPermissions(current);
        setPermissions(perms);
    }
  };

  const refreshSystemConfig = async () => {
      const config = await storageService.getSystemConfig();
      setSystemConfig(config);
  };
  
  const updatePassword = async (pass: string) => {
      if (user) {
          const updated = await storageService.updatePassword(user.id, pass);
          if (updated) setUser(updated);
      }
  }

  const hasPermission = (permission: string) => {
      return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider value={{ user, permissions, systemConfig, login, logout, refreshUser, refreshSystemConfig, updatePassword, hasPermission }}>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            
            <Route path="/courses" element={
                hasPermission(PERMISSIONS.VIEW_COURSES) ? <Courses /> : <Navigate to="/" />
            } />
            <Route path="/catalog" element={<CatalogPage />} />
            
            <Route path="/materials" element={<Materials />} />
            {/* Nova Rota: Editor de Material */}
            <Route path="/materials/new" element={
                hasPermission(PERMISSIONS.CREATE_MATERIAL) ? <MaterialEditor /> : <Navigate to="/materials" />
            } />
            <Route path="/materials/edit/:id" element={
                hasPermission(PERMISSIONS.CREATE_MATERIAL) ? <MaterialEditor /> : <Navigate to="/materials" />
            } />

            <Route path="/p/:slug" element={<PageViewer />} />
            
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/community" element={<CommunityPage />} />

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

            <Route path="/integrations" element={
              hasPermission(PERMISSIONS.USE_PIPEDREAM) ? <IntegrationsPage /> : <Navigate to="/" />
            } />

            <Route path="/email-config" element={
              hasPermission(PERMISSIONS.MANAGE_SETTINGS) ? <EmailConfigPage /> : <Navigate to="/" />
            } />
             <Route path="/system-settings" element={
              hasPermission(PERMISSIONS.MANAGE_SETTINGS) ? <SystemSettings /> : <Navigate to="/" />
            } />
             <Route path="/db-test" element={
              hasPermission(PERMISSIONS.MANAGE_SETTINGS) ? <DatabaseTest /> : <Navigate to="/" />
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </HashRouter>
    </AuthContext.Provider>
  );
}