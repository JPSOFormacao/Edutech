import { User, Course, Material, Page, UserRole, UserStatus, MaterialType, EmailConfig, RoleEntity, ClassEntity, PERMISSIONS } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  CURRENT_USER: 'edutech_current_user',
};

// Lista de emails que têm permissão automática de Admin (Backdoor de recuperação)
const SUPER_ADMINS = [
  'admin@edutech.pt', 
  'jpsoliveira.formacao@hotmail.com',
  'formador@edutech.pt'
];

// --- Seed Data (Backup) ---
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
  // --- SEEDING ---
  checkAndSeedData: async () => {
    // Verificar se já existem cursos
    const { count } = await supabase.from('courses').select('*', { count: 'exact', head: true });
    
    if (count === 0) {
        console.log("Base de dados vazia detetada. A criar dados de exemplo...");
        
        // 1. Criar Roles (garantir que existem)
        await supabase.from('roles').upsert(INITIAL_ROLES);

        // 2. Criar Cursos
        const courses: Course[] = [
            { 
                id: 'c_py_01', 
                title: 'Python para Data Science', 
                category: 'Programação', 
                description: 'Domine Python e as suas bibliotecas principais para análise de dados.', 
                imageUrl: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&q=80&w=800', 
                duration: '40 Horas', 
                price: 199.99,
                syllabus: "Módulo 1: Introdução ao Python\nMódulo 2: Estruturas de Dados\nMódulo 3: Pandas e NumPy\nMódulo 4: Visualização com Matplotlib",
                requirements: "Computador com acesso à internet. Noções básicas de lógica de programação recomendadas.",
                certificationInfo: "Certificado de Conclusão Profissional EduTech"
            },
            { 
                id: 'c_web_01', 
                title: 'Desenvolvimento Web Fullstack', 
                category: 'Web Dev', 
                description: 'Aprenda React, Node.js e Bases de Dados modernas.', 
                imageUrl: 'https://images.unsplash.com/photo-1593720213428-28a5b9e94613?auto=format&fit=crop&q=80&w=800', 
                duration: '60 Horas', 
                price: 249.50,
                syllabus: "Módulo 1: HTML5 & CSS3\nMódulo 2: JavaScript Moderno\nMódulo 3: React & Hooks\nMódulo 4: Node.js & APIs",
                requirements: "Nenhum conhecimento prévio necessário.",
                certificationInfo: "Diploma Fullstack Junior"
            },
            { id: 'c_ai_01', title: 'Introdução à IA Generativa', category: 'Inteligência Artificial', description: 'Compreenda como funcionam os LLMs e como criar prompts eficazes.', imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800', duration: '20 Horas', price: 149.00 },
            { id: 'c_sec_01', title: 'Cibersegurança Essencial', category: 'Segurança', description: 'Proteja sistemas e redes contra ameaças digitais.', imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800', duration: '30 Horas', price: 179.90 }
        ];
        await supabase.from('courses').upsert(courses);

        // 3. Criar Turmas
        const classes: ClassEntity[] = [
            { id: 'cl_a_2024', name: 'Turma A - Manhã', description: 'Horário: 09:00 - 13:00' },
            { id: 'cl_b_2024', name: 'Turma B - Pós-Laboral', description: 'Horário: 19:00 - 23:00' }
        ];
        await supabase.from('classes').upsert(classes);

        // 4. Criar Utilizadores
        const users: User[] = [
            { 
                id: 'usr_admin', 
                email: 'admin@edutech.pt', 
                name: 'Administrador',
                fullName: 'Administrador do Sistema',
                role: UserRole.ADMIN, 
                roleId: 'role_admin', 
                status: UserStatus.ACTIVE, 
                allowedCourses: [], 
                password: 'admin', 
                avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
                mustChangePassword: false,
                bio: "Gestor principal da plataforma EduTech PT."
            },
            { 
                id: 'usr_formador', 
                email: 'formador@edutech.pt', 
                name: 'João Formador', 
                fullName: 'João Silva Formador',
                role: UserRole.EDITOR, 
                roleId: 'role_editor', 
                status: UserStatus.ACTIVE, 
                allowedCourses: ['c_py_01', 'c_web_01', 'c_ai_01', 'c_sec_01'], 
                password: '123', 
                avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joao',
                mustChangePassword: false,
                bio: "Formador sénior com 10 anos de experiência em desenvolvimento web."
            },
            { 
                id: 'usr_aluno1', 
                email: 'aluno1@edutech.pt', 
                name: 'Maria Silva', 
                fullName: 'Maria Antonia Silva',
                role: UserRole.ALUNO, 
                roleId: 'role_aluno', 
                status: UserStatus.ACTIVE, 
                allowedCourses: ['c_web_01'], 
                classId: 'cl_a_2024',
                password: '123', 
                avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
                mustChangePassword: false,
                bio: "Estudante entusiasta de tecnologia."
            },
            { 
                id: 'usr_aluno2', 
                email: 'aluno2@edutech.pt', 
                name: 'Pedro Santos', 
                fullName: 'Pedro Miguel Santos',
                role: UserRole.ALUNO, 
                roleId: 'role_aluno', 
                status: UserStatus.ACTIVE, 
                allowedCourses: ['c_py_01', 'c_ai_01'], 
                classId: 'cl_b_2024',
                password: '123', 
                avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro',
                mustChangePassword: false
            }
        ];
        await supabase.from('users').upsert(users);

        // 5. Criar Materiais
        const materials: Material[] = [
            { id: 'mat_01', courseId: 'c_web_01', title: 'Guia de Instalação React', type: MaterialType.RECURSO, linkOrContent: 'https://react.dev', createdAt: new Date().toISOString() },
            { id: 'mat_02', courseId: 'c_py_01', title: 'Exercícios Pandas', type: MaterialType.TRABALHO, linkOrContent: 'https://pandas.pydata.org', createdAt: new Date().toISOString() }
        ];
        await supabase.from('materials').upsert(materials);
        
        console.log("Dados de exemplo criados com sucesso.");
    }
  },

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
    const { error } = await supabase.from('users').upsert(users);
    if (error) console.error('Error saving users:', error);
  },
  
  saveUser: async (user: User) => {
      // Garantir que não perdemos campos opcionais ao gravar
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
    
    // Seed inicial se vazio ou erro (tabela não existe ainda)
    if (error || !data || data.length === 0) {
        // Tenta fazer seed silencioso se a conexão estiver OK mas vazia
        if (!error || (error && error.code !== '42P01')) { // 42P01 é tabela inexistente
             await supabase.from('roles').upsert(INITIAL_ROLES);
        }
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
    await supabase.from('email_config').upsert({ ...config, id: 'default_config' });
  },

  // --- AUTH / SESSION ---
  
  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!stored) return null;
    return JSON.parse(stored) as User;
  },
  
  refreshSession: async (): Promise<User | null> => {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if(!stored) return null;
      
      const sessionUser = JSON.parse(stored) as User;
      const { data: dbUser } = await supabase.from('users').select('*').eq('id', sessionUser.id).single();
      
      if (dbUser) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(dbUser));
          return dbUser;
      } else {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          return null;
      }
  },
  
  getUserPermissions: async (user: User | null): Promise<string[]> => {
    if (!user) return [];
    
    // 1. Obter Roles (com auto-seed se vazio)
    let { data: roles } = await supabase.from('roles').select('*');
    
    if (!roles || roles.length === 0) {
        console.log("Roles table empty, using INITIAL_ROLES fallback.");
        await supabase.from('roles').upsert(INITIAL_ROLES);
        roles = INITIAL_ROLES;
    }
    
    const allRoles = roles || INITIAL_ROLES;
    
    // 2. Determinar Role ID
    let roleId = user.roleId;
    if (!roleId) {
         if (user.role === UserRole.ADMIN) roleId = 'role_admin';
         else if (user.role === UserRole.EDITOR) roleId = 'role_editor';
         else roleId = 'role_aluno';
    }

    // 3. Encontrar Role e Permissões
    const userRole = allRoles.find(r => r.id === roleId);
    
    if (userRole) {
        return userRole.permissions;
    }

    if (user.role === UserRole.ADMIN) return INITIAL_ROLES.find(r => r.id === 'role_admin')?.permissions || [];
    if (user.role === UserRole.EDITOR) return INITIAL_ROLES.find(r => r.id === 'role_editor')?.permissions || [];
    
    return INITIAL_ROLES.find(r => r.id === 'role_aluno')?.permissions || [];
  },

  login: async (email: string, password?: string): Promise<User> => {
    const normalizedEmail = email.trim().toLowerCase();
    
    // 1. Procurar utilizador na DB
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail);
        
    if (error) {
       if (error.message.includes('relation') || error.code === '42P01') {
           throw new Error("Erro de Base de Dados: As tabelas não existem no Supabase. Por favor execute o SQL de configuração.");
       }
       throw new Error(error.message);
    }

    // 2. Lógica de Login
    let user = users?.find(u => u.status === UserStatus.ACTIVE) || users?.[0];
    const isSuperAdmin = SUPER_ADMINS.includes(normalizedEmail);

    if (!user) {
      // Registo Automático
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const isFirstUser = count === 0;
      
      const shouldBeAdmin = isFirstUser || isSuperAdmin;

      const newUser: User = {
        id: Date.now().toString(),
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0],
        fullName: normalizedEmail.split('@')[0], // Default FullName
        role: shouldBeAdmin ? UserRole.ADMIN : UserRole.ALUNO, 
        roleId: shouldBeAdmin ? 'role_admin' : 'role_aluno',
        status: shouldBeAdmin ? UserStatus.ACTIVE : UserStatus.PENDING,
        allowedCourses: [],
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedEmail}`,
        password: password || '123456',
        mustChangePassword: false
      };
      
      const { error: createError } = await supabase.from('users').insert(newUser);
      if (createError) throw new Error("Erro ao criar conta: " + createError.message);
      
      user = newUser;
    } else {
        // AUTO-REPARAÇÃO
        if (isSuperAdmin && (user.role !== UserRole.ADMIN || user.status !== UserStatus.ACTIVE)) {
             console.log("Recuperação de conta de Administrador...");
             const updates = { 
                 role: UserRole.ADMIN, 
                 roleId: 'role_admin', 
                 status: UserStatus.ACTIVE 
             };
             await supabase.from('users').update(updates).eq('id', user.id);
             user = { ...user, ...updates };
        }

        // Verificar Senha
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