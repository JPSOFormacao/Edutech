import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icons } from './Icons';
import { User, UserRole } from '../types';

interface SidebarProps {
  user: User;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  
  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors mb-1 ${
          isActive
            ? 'bg-slate-800 text-indigo-400 border-r-4 border-indigo-500'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        }`
      }
    >
      <Icon className="mr-3 h-5 w-5" />
      {label}
    </NavLink>
  );

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full fixed left-0 top-0 border-r border-slate-800 z-10 shadow-xl">
      <div className="flex items-center justify-center h-16 border-b border-slate-800">
        <div className="flex items-center gap-2">
           <div className="bg-indigo-600 p-1.5 rounded-lg">
             <Icons.Student className="text-white w-6 h-6" />
           </div>
           <h1 className="text-xl font-bold tracking-tight">EduTech <span className="text-indigo-500">PT</span></h1>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        <NavItem to="/" icon={Icons.Dashboard} label="Dashboard" />
        
        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Formação
        </div>
        <NavItem to="/courses" icon={Icons.Courses} label="Cursos" />
        <NavItem to="/materials" icon={Icons.Materials} label="Materiais Didáticos" />
        
        {(user.role === UserRole.ADMIN || user.role === UserRole.EDITOR) && (
          <>
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gestão
            </div>
            {user.role === UserRole.ADMIN && (
              <NavItem to="/users" icon={Icons.Users} label="Utilizadores" />
            )}
             <NavItem to="/cms" icon={Icons.CMS} label="Páginas / CMS" />
             <NavItem to="/ai-studio" icon={Icons.AI} label="AI Studio" />
          </>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-850">
        <div className="flex items-center gap-3 mb-4">
          <img 
            src={user.avatarUrl || 'https://via.placeholder.com/40'} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-indigo-500"
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