import { User, Course, Material, Page, UserRole, UserStatus, MaterialType, EmailConfig, RoleEntity, ClassEntity, PERMISSIONS } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  CURRENT_USER: 'edutech_current_user',
};

// --- Seed Data (Backup) ---
// Mantemos isto apenas para referência ou inicialização manual se necessário
const INITIAL_ROLES = [
  {
    id: 'role_admin',
    name: 'Administrador',
    isSystem: true,
    permissions: Object.values(PERMISSIONS)
  },
  {
    id: 'role_editor',
    name: 'Formador',
    isSystem: true,
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.MANAGE_COURSES,
      PERMISSIONS.MANAGE_CONTENT,
      PERMISSIONS.USE_AI_STUDIO,
      PERMISSIONS.VIEW_COURSES
    ]
  },
  {
    id: 'role_aluno',
    name: 'Aluno',
    isSystem: true,
    permissions: [
      PERMISSIONS.VIEW_DASHBOARD,
      PERMISSIONS.VIEW_COURSES
    ]
  }
];

export const storageService = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }
    return data || [];
  },
  
  saveUsers: async (users: User[]) => {
    // No Supabase, "saveUsers" geralmente significa upsert de um ou vários
    // Para simplificar a migração do código antigo que enviava o array todo:
    const { error } = await supabase.from('users').upsert(users);
    if (error) console.error('Error saving users:', error);
  },
  
  // Wrapper para operações individuais (melhor prática)
  saveUser: async (user: User) => {
      const { error } = await supabase.from('users').upsert(user);
      if (error) throw error;
  },
  
  deleteUser: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
  },

  // --- ROLES ---
  getRoles: async (): Promise<RoleEntity[]> => {
    const { data, error } = await supabase.from('roles').select('*');
    if (error) return [];
    
    // Seed inicial se vazio
    if (!data || data.length === 0) {
        await supabase.from('roles').upsert(INITIAL_ROLES);
        return INITIAL_ROLES;
    }
    return data;
  },
  saveRoles: async (roles: RoleEntity[]) => {
    await supabase.from('roles').upsert(roles);
  },

  // --- CLASSES ---
  getClasses: async (): Promise<ClassEntity[]> => {
    const { data, error } = await supabase.from('classes').select('*');
    return data || [];
  },
  saveClasses: async (classes: ClassEntity[]) => {
    await supabase.from('classes').upsert(classes);
  },
  deleteClass: async (id: string) => {
      await supabase.from('classes').delete().eq('id', id);
  },

  // --- COURSES ---
  getCourses: async (): Promise<Course[]> => {
    const { data } = await supabase.from('courses').select('*');
    return data || [];
  },
  saveCourses: async (courses: Course[]) => {
    await supabase.from('courses').upsert(courses);
  },
  deleteCourse: async (id: string) => {
      await supabase.from('courses').delete().eq('id', id);
  },

  // --- MATERIALS ---
  getMaterials: async (): Promise<Material[]> => {
    const { data } = await supabase.from('materials').select('*');
    return data || [];
  },
  saveMaterials: async (materials: Material[]) => {
    await supabase.from('materials').upsert(materials);
  },
  deleteMaterial: async (id: string) => {
      await supabase.from('materials').delete().eq('id', id);
  },

  // --- PAGES ---
  getPages: async (): Promise<Page[]> => {
    const { data } = await supabase.from('pages').select('*');
    return data || [];
  },
  savePages: async (pages: Page[]) => {
    await supabase.from('pages').upsert(pages);
  },
  deletePage: async (slug: string) => {
      await supabase.from('pages').delete().eq('slug', slug);
  },

  // --- EMAIL CONFIG ---
  getEmailConfig: async (): Promise<EmailConfig | null> => {
    const { data } = await supabase.from('email_config').select('*').single();
    return data || null;
  },
  saveEmailConfig: async (config: EmailConfig) => {
    // Usamos um ID fixo para configuração
    await supabase.from('email_config').upsert({ ...config, id: 'default_config' });
  },

  // --- AUTH / SESSION ---
  // Mantemos o currentUser em LocalStorage para persistência de sessão rápida,
  // mas validamos contra a DB.
  
  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!stored) return null;
    return JSON.parse(stored) as User;
  },
  
  // Novo helper para sincronizar a sessão
  refreshSession: async (): Promise<User | null> => {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if(!stored) return null;
      
      const sessionUser = JSON.parse(stored) as User;
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', sessionUser.id).single();
      
      if (dbUser) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(dbUser));
          return dbUser;
      } else {
          // Utilizador apagado da DB? Logout
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          return null;
      }
  },
  
  getUserPermissions: async (user: User | null): Promise<string[]> => {
    if (!user) return [];
    
    // Fetch roles directly from Supabase to ensure latest permissions
    const { data: roles } = await supabase.from('roles').select('*');
    const allRoles = roles || [];
    
    let roleId = user.roleId;
    if (!roleId) {
         if (user.role === UserRole.ADMIN) roleId = 'role_admin';
         else if (user.role === UserRole.EDITOR) roleId = 'role_editor';
         else roleId = 'role_aluno';
    }

    const userRole = allRoles.find(r => r.id === roleId);
    return userRole ? userRole.permissions : [];
  },

  login: async (email: string, password?: string): Promise<User> => {
    const normalizedEmail = email.trim().toLowerCase();
    
    // 1. Procurar utilizador na DB
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail);
        
    if (error) throw new Error(error.message);

    // 2. Lógica de Login
    let user = users?.find(u => u.status === UserStatus.ACTIVE) || users?.[0];

    if (!user) {
      // Registo Automático (Como PENDING)
      const newUser: User = {
        id: Date.now().toString(),
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        role: UserRole.ALUNO, 
        roleId: 'role_aluno',
        status: UserStatus.PENDING,
        allowedCourses: [],
        avatarUrl: `https://ui-avatars.com/api/?name=${normalizedEmail}&background=random`,
        password: password || '123456',
        mustChangePassword: false
      };
      
      const { error: createError } = await supabase.from('users').insert(newUser);
      if (createError) throw new Error("Erro ao criar conta: " + createError.message);
      
      user = newUser;
    } else {
        // Verificar Senha (Simples comparação de string como no original)
        // NOTA: Em produção deve-se usar supabase.auth
        if (user.password && user.password !== password) {
            throw new Error("Senha incorreta.");
        }
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  },

  updatePassword: async (userId: string, newPassword: string): Promise<User | null> => {
    const { data, error } = await supabase
        .from('users')
        .update({ password: newPassword, mustChangePassword: false })
        .eq('id', userId)
        .select()
        .single();
        
    if (error || !data) return null;
    
    // Atualizar sessão se for o próprio
    const currentUser = storageService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data));
    }

    return data;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};