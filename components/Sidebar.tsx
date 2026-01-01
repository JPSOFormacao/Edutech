import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import { User, PERMISSIONS, SystemConfig, UserStatus } from '../types';
import { storageService } from '../services/storageService';

interface SidebarProps {
  user: User;
  onLogout: () => void;
  hasPermission: (perm: string) => boolean;
  systemConfig?: SystemConfig | null; // Configuração dinâmica
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout, hasPermission, systemConfig }) => {
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  // Verificar utilizadores pendentes ou com pedidos
  useEffect(() => {
    const checkPendingUsers = async () => {
        if (hasPermission(PERMISSIONS.MANAGE_USERS)) {
            try {
                const users = await storageService.getUsers();
                const count = users.filter(u => 
                    u.status === UserStatus.PENDING || 
                    (u.enrollmentRequests && u.enrollmentRequests.some(r => r.status === 'PENDING'))
                ).length;
                setPendingCount(count);
            } catch (e) {
                console.error("Erro ao verificar notificações sidebar", e);
            }
        }
    };
    checkPendingUsers();
  }, [user, location.pathname, hasPermission]); // Atualiza ao navegar

  const NavItem = ({ to, icon: Icon, label, badgeCount }: { to: string; icon: any; label: string, badgeCount?: number }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-3 text-sm font-medium rounded-md transition-colors mb-1 ${
          isActive
            ? 'bg-slate-800 text-indigo-400 border-r-4 border-indigo-500'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <div className="flex items-center">
          <Icon className="mr-3 h-5 w-5" />
          {label}
      </div>
      {badgeCount !== undefined && badgeCount > 0 && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {badgeCount}
          </span>
      )}
    </NavLink>
  );

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full fixed left-0 top-0 border-r border-slate-800 z-10 shadow-xl">
      <div className="flex items-center justify-center h-16 border-b border-slate-800 px-4">
        {/* Lógica de Logo Dinâmico */}
        <div className="flex items-center gap-2 overflow-hidden">
           {systemConfig?.logoUrl ? (
               <img src={systemConfig.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
           ) : (
               <div className="bg-indigo-600 p-1.5 rounded-lg flex-shrink-0">
                 <Icons.Student className="text-white w-6 h-6" />
               </div>
           )}
           
           <h1 className="text-xl font-bold tracking-tight truncate">
               {systemConfig?.platformName ? (
                   <span className="text-white">{systemConfig.platformName}</span>
               ) : (
                   <>EduTech <span className="text-indigo-500">PT</span></>
               )}
           </h1>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/" icon={Icons.Dashboard} label="Painel Principal" />
        
        {/* Community & Profile */}
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Comunidade
        </div>
        <NavItem to="/community" icon={Icons.Class} label="Comunidade Escolar" />
        <NavItem to="/profile" icon={Icons.Users} label="O Meu Perfil" />

        {/* Oferta Formativa Publica para Alunos */}
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
             Formação
        </div>
        
        <NavItem to="/catalog" icon={Icons.Search} label="Oferta Formativa" />

        {hasPermission(PERMISSIONS.VIEW_COURSES) && (
            <>
                <NavItem to="/courses" icon={Icons.Courses} label="Meus Cursos" />
                <NavItem to="/materials" icon={Icons.Materials} label="Materiais Didáticos" />
            </>
        )}
        
        {(hasPermission(PERMISSIONS.MANAGE_USERS) || hasPermission(PERMISSIONS.MANAGE_CONTENT)) && (
          <>
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gestão
            </div>
            
            {hasPermission(PERMISSIONS.MANAGE_USERS) && (
                <NavItem to="/users" icon={Icons.Users} label="Utilizadores" badgeCount={pendingCount} />
            )}
            
            {hasPermission(PERMISSIONS.MANAGE_CLASSES) && (
                <NavItem to="/classes" icon={Icons.Class} label="Gestão Turmas" />
            )}

            {hasPermission(PERMISSIONS.MANAGE_ROLES) && (
                <NavItem to="/roles" icon={Icons.Role} label="Cargos" />
            )}

            {hasPermission(PERMISSIONS.MANAGE_CONTENT) && (
                 <NavItem to="/cms" icon={Icons.CMS} label="Páginas / CMS" />
            )}
            
            {hasPermission(PERMISSIONS.USE_AI_STUDIO) && (
                 <NavItem to="/ai-studio" icon={Icons.AI} label="Estúdio IA" />
            )}
             
            {hasPermission(PERMISSIONS.MANAGE_SETTINGS) && (
               <>
                   <NavItem to="/email-config" icon={Icons.Mail} label="Configuração Email" />
                   <NavItem to="/system-settings" icon={Icons.Settings} label="Branding & Sistema" />
                   <NavItem to="/db-test" icon={Icons.Active} label="Diagnóstico DB" />
               </>
             )}
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-850">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src={user.avatarUrl || 'https://via.placeholder.com/40'} 
            alt="Perfil" 
            className="w-10 h-10 rounded-full border-2 border-indigo-500 object-cover"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-indigo-900 text-indigo-300 border border-indigo-700">
              {user.role}
            </span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center px-4 py-2 text-sm text-red-400 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
        >
          <Icons.Logout className="w-4 h-4 mr-2" />
          Terminar Sessão
        </button>
      </div>
    </div>
  );
};