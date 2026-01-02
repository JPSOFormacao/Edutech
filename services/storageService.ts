import { User, Course, Material, Page, UserRole, UserStatus, MaterialType, EmailConfig, RoleEntity, ClassEntity, PERMISSIONS, Testimonial, TestimonialStatus, SystemConfig, UploadedFile, FileDeletionLog, EmailConfigProfile, EmailTemplates } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_KEYS = {
  CURRENT_USER: 'edutech_current_user',
  EMAIL_CONFIG: 'edutech_email_config',
  SYSTEM_CONFIG: 'edutech_system_config',
  USERS: 'edutech_users',
  ROLES: 'edutech_roles',
  CLASSES: 'edutech_classes',
  COURSES: 'edutech_courses',
  MATERIALS: 'edutech_materials',
  PAGES: 'edutech_pages',
  TESTIMONIALS: 'edutech_testimonials',
  FILES: 'edutech_files',
  DELETION_LOGS: 'edutech_deletion_logs'
};

// Lista de emails que têm permissão automática de Admin (Backdoor de recuperação)
const SUPER_ADMINS = [
  'admin@edutech.pt', 
  'jpsoliveira.formacao@hotmail.com',
  'formador@edutech.pt'
];

// --- Seed Data ---
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
      PERMISSIONS.MANAGE_USERS,
      PERMISSIONS.MANAGE_COURSES,
      PERMISSIONS.MANAGE_CONTENT,
      PERMISSIONS.CREATE_MATERIAL, // Nova Permissão
      PERMISSIONS.USE_AI_STUDIO,
      PERMISSIONS.VIEW_COURSES,
      PERMISSIONS.USE_PIPEDREAM,
      PERMISSIONS.VIEW_LOGS 
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

// --- Helper Functions for Hybrid Storage ---
async function fetchWithFallback<T>(tableName: string, storageKey: string, seedData: T[] = []): Promise<T[]> {
    // 1. Tentar ler do Supabase
    try {
        const { data, error } = await supabase.from(tableName).select('*');
        if (!error && data) {
            // Atualizar Cache Local
            localStorage.setItem(storageKey, JSON.stringify(data));
            return data as T[];
        }
    } catch (e) {
        // Ignorar erro de conexão silenciosamente e usar cache
        // console.warn(`Supabase fetch failed for ${tableName}, using fallback.`);
    }

    // 2. Fallback para LocalStorage
    try {
        const cached = localStorage.getItem(storageKey);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (e) {}

    // 3. Fallback para Seed Data (se cache vazio) e inicializar cache
    if (seedData.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(seedData));
        return seedData;
    }

    return [];
}

async function saveWithFallback<T extends { id?: string, slug?: string }>(tableName: string, storageKey: string, items: T[], idField: keyof T = 'id' as keyof T) {
    // 1. Atualizar LocalStorage (Optimistic UI)
    try {
        const currentCacheStr = localStorage.getItem(storageKey);
        let currentCache: T[] = currentCacheStr ? JSON.parse(currentCacheStr) : [];
        
        items.forEach(item => {
            const index = currentCache.findIndex(c => c[idField] === item[idField]);
            if (index >= 0) {
                currentCache[index] = { ...currentCache[index], ...item };
            } else {
                currentCache.push(item);
            }
        });
        localStorage.setItem(storageKey, JSON.stringify(currentCache));
    } catch (e) {}

    // 2. Tentar persistir no Supabase
    try {
        await supabase.from(tableName).upsert(items);
    } catch (e) {
        console.warn(`Supabase save failed for ${tableName}, data saved locally.`);
    }
}

async function deleteWithFallback(tableName: string, storageKey: string, id: string, idField: string = 'id') {
    // 1. Atualizar LocalStorage
    try {
        const currentCacheStr = localStorage.getItem(storageKey);
        if (currentCacheStr) {
            let currentCache: any[] = JSON.parse(currentCacheStr);
            currentCache = currentCache.filter(item => item[idField] !== id);
            localStorage.setItem(storageKey, JSON.stringify(currentCache));
        }
    } catch (e) {}

    // 2. Tentar apagar no Supabase
    try {
        await supabase.from(tableName).delete().eq(idField, id);
    } catch (e) {
        console.warn(`Supabase delete failed for ${tableName}, item deleted locally.`);
    }
}

export const storageService = {
  // --- SEEDING ---
  checkAndSeedData: async () => {
      // Forçamos um load inicial de tudo para garantir que o LocalStorage tem dados
      // Se o Supabase falhar, o fetchWithFallback usará os dados de seed definidos abaixo.
      
      await storageService.getRoles();
      
      const coursesSeed: Course[] = [
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
      await fetchWithFallback('courses', STORAGE_KEYS.COURSES, coursesSeed);

      const classesSeed: ClassEntity[] = [
            { id: 'cl_a_2024', name: 'Turma A - Manhã', description: 'Horário: 09:00 - 13:00' },
            { id: 'cl_b_2024', name: 'Turma B - Pós-Laboral', description: 'Horário: 19:00 - 23:00' }
      ];
      await fetchWithFallback('classes', STORAGE_KEYS.CLASSES, classesSeed);

      const usersSeed: User[] = [
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
      await fetchWithFallback('users', STORAGE_KEYS.USERS, usersSeed);

      const materialsSeed: Material[] = [
            { id: 'mat_01', courseId: 'c_web_01', title: 'Guia de Instalação React', type: MaterialType.RECURSO, linkOrContent: 'https://react.dev', createdAt: new Date().toISOString() },
            { id: 'mat_02', courseId: 'c_py_01', title: 'Exercícios Pandas', type: MaterialType.TRABALHO, linkOrContent: 'https://pandas.pydata.org', createdAt: new Date().toISOString() }
      ];
      await fetchWithFallback('materials', STORAGE_KEYS.MATERIALS, materialsSeed);

      const testimonialsSeed: Testimonial[] = [
          {
            id: 'tm_1',
            userId: 'usr_aluno1',
            userName: 'Maria Silva',
            userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria',
            role: 'Aluna de Web Dev',
            content: "A EduTech mudou a minha carreira! O curso de Web Fullstack é muito prático e consegui emprego em 3 meses.",
            rating: 5,
            status: TestimonialStatus.APPROVED,
            createdAt: new Date().toISOString()
          },
          {
            id: 'tm_2',
            userId: 'usr_aluno2',
            userName: 'Pedro Santos',
            userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Pedro',
            role: 'Aluno de Python',
            content: "Excelente plataforma. Os formadores estão sempre disponíveis e os materiais são de topo.",
            rating: 4,
            status: TestimonialStatus.APPROVED,
            createdAt: new Date().toISOString()
          }
      ];
      await fetchWithFallback('testimonials', STORAGE_KEYS.TESTIMONIALS, testimonialsSeed);
  },

  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    return fetchWithFallback('users', STORAGE_KEYS.USERS);
  },
  
  saveUsers: async (users: User[]) => {
    return saveWithFallback('users', STORAGE_KEYS.USERS, users);
  },
  
  saveUser: async (user: User) => {
    return saveWithFallback('users', STORAGE_KEYS.USERS, [user]);
  },
  
  deleteUser: async (id: string) => {
      // Logic for testimonials unlink
      const testimonials = await storageService.getTestimonials();
      const toUpdate = testimonials.filter(t => t.userId === id && t.status === TestimonialStatus.APPROVED).map(t => ({...t, userId: null}));
      if (toUpdate.length > 0) await storageService.saveTestimonial(toUpdate[0] as Testimonial); // Simplification, ideally batch

      // Delete testimonials pending/rejected
      // const toDelete = testimonials.filter(t => t.userId === id && t.status !== TestimonialStatus.APPROVED);
      // for(const t of toDelete) await deleteWithFallback('testimonials', STORAGE_KEYS.TESTIMONIALS, t.id);

      return deleteWithFallback('users', STORAGE_KEYS.USERS, id);
  },
  
  register: async (user: Partial<User>): Promise<{user: User, token: string}> => {
      const email = user.email?.toLowerCase().trim();
      
      const users = await storageService.getUsers();
      const existing = users.find(u => u.email === email);
      if (existing) {
          throw new Error("Este email já se encontra registado.");
      }
      
      const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const newUser: User = {
          id: Date.now().toString(),
          email: email || '',
          name: user.name || '',
          fullName: user.fullName || '',
          role: UserRole.ALUNO,
          roleId: 'role_aluno',
          status: UserStatus.PENDING,
          password: user.password,
          allowedCourses: [],
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
          mustChangePassword: false,
          emailVerified: false, 
          verificationToken: verificationToken,
          ...user
      } as User;
      
      await storageService.saveUser(newUser);
      
      return { user: newUser, token: verificationToken };
  },

  verifyUserEmail: async (token: string): Promise<boolean> => {
      const users = await storageService.getUsers();
      const user = users.find(u => u.verificationToken === token);
      
      if (!user) return false;
      
      const updatedUser = { ...user, emailVerified: true, verificationToken: undefined };
      await storageService.saveUser(updatedUser as User);
      return true;
  },

  // --- ROLES ---
  getRoles: async (): Promise<RoleEntity[]> => {
    const roles = await fetchWithFallback('roles', STORAGE_KEYS.ROLES, INITIAL_ROLES);
    
    // Atualizar dinamicamente o Admin para ter SEMPRE todas as permissões no array
    const adminRole = roles.find(r => r.id === 'role_admin');
    if (adminRole) {
        adminRole.permissions = Object.values(PERMISSIONS);
    }
    
    return roles;
  },
  
  saveRoles: async (roles: RoleEntity[]) => {
    return saveWithFallback('roles', STORAGE_KEYS.ROLES, roles);
  },

  // --- CLASSES ---
  getClasses: async (): Promise<ClassEntity[]> => {
    return fetchWithFallback('classes', STORAGE_KEYS.CLASSES);
  },
  saveClasses: async (classes: ClassEntity[]) => {
    return saveWithFallback('classes', STORAGE_KEYS.CLASSES, classes);
  },
  deleteClass: async (id: string) => {
    return deleteWithFallback('classes', STORAGE_KEYS.CLASSES, id);
  },

  // --- COURSES ---
  getCourses: async (): Promise<Course[]> => {
    return fetchWithFallback('courses', STORAGE_KEYS.COURSES);
  },
  saveCourses: async (courses: Course[]) => {
    return saveWithFallback('courses', STORAGE_KEYS.COURSES, courses);
  },
  deleteCourse: async (id: string) => {
    return deleteWithFallback('courses', STORAGE_KEYS.COURSES, id);
  },

  // --- MATERIALS ---
  getMaterials: async (): Promise<Material[]> => {
    return fetchWithFallback('materials', STORAGE_KEYS.MATERIALS);
  },
  saveMaterials: async (materials: Material[]) => {
    return saveWithFallback('materials', STORAGE_KEYS.MATERIALS, materials);
  },
  deleteMaterial: async (id: string) => {
    return deleteWithFallback('materials', STORAGE_KEYS.MATERIALS, id);
  },

  // --- PAGES ---
  getPages: async (): Promise<Page[]> => {
    return fetchWithFallback('pages', STORAGE_KEYS.PAGES);
  },
  savePages: async (pages: Page[]) => {
    return saveWithFallback('pages', STORAGE_KEYS.PAGES, pages, 'slug');
  },
  deletePage: async (slug: string) => {
    return deleteWithFallback('pages', STORAGE_KEYS.PAGES, slug, 'slug');
  },

  // --- TESTIMONIALS ---
  getTestimonials: async (): Promise<Testimonial[]> => {
    return fetchWithFallback('testimonials', STORAGE_KEYS.TESTIMONIALS);
  },
  saveTestimonial: async (testimonial: Testimonial) => {
    return saveWithFallback('testimonials', STORAGE_KEYS.TESTIMONIALS, [testimonial]);
  },
  deleteTestimonial: async (id: string) => {
    return deleteWithFallback('testimonials', STORAGE_KEYS.TESTIMONIALS, id);
  },

  // --- UPLOADED FILES ---
  getFiles: async (): Promise<UploadedFile[]> => {
    return fetchWithFallback('uploaded_files', STORAGE_KEYS.FILES);
  },
  saveFile: async (file: UploadedFile) => {
    return saveWithFallback('uploaded_files', STORAGE_KEYS.FILES, [file]);
  },
  deleteFile: async (id: string) => {
    return deleteWithFallback('uploaded_files', STORAGE_KEYS.FILES, id);
  },

  // --- FILE DELETION LOGS ---
  getDeletionLogs: async (): Promise<FileDeletionLog[]> => {
    return fetchWithFallback('deletion_logs', STORAGE_KEYS.DELETION_LOGS);
  },

  addDeletionLog: async (file: UploadedFile, user: User): Promise<FileDeletionLog[]> => {
      const newLog: FileDeletionLog = {
          id: Date.now().toString(),
          fileName: file.fileName,
          deletedBy: user.id,
          deletedByName: user.name,
          deletedAt: new Date().toISOString(),
          emailSent: false
      };
      
      await saveWithFallback('deletion_logs', STORAGE_KEYS.DELETION_LOGS, [newLog]);
      
      // Return fresh logs to check count
      const logs = await storageService.getDeletionLogs();
      return logs.filter(l => !l.emailSent);
  },

  markLogsAsSent: async (logIds: string[]) => {
      const allLogs = await storageService.getDeletionLogs();
      const updatedLogs = allLogs.map(log => 
          logIds.includes(log.id) ? { ...log, emailSent: true } : log
      );
      await saveWithFallback('deletion_logs', STORAGE_KEYS.DELETION_LOGS, updatedLogs);
  },

  // --- EMAIL CONFIG ---
  getEmailConfig: async (): Promise<EmailConfig | null> => {
    const emptyTemplates: EmailTemplates = {
        welcomeId: '',
        resetPasswordId: '',
        enrollmentId: '',
        notificationId: '',
        verificationId: '',
        auditLogId: ''
    };

    const baseConfig: EmailConfig = {
        serviceId: '',
        publicKey: '',
        templates: { ...emptyTemplates },
        activeProfileIndex: 0,
        profiles: Array(5).fill(null).map(() => ({ serviceId: '', publicKey: '', templates: { ...emptyTemplates }, isActive: false })),
        customErrorMessage: '',
        customContent: {
            welcomeText: '',
            verificationText: '',
            resetPasswordText: '',
            auditLogText: ''
        }
    };

    // Tentar DB (com fallback)
    let dbData: any = {};
    try {
        const { data } = await supabase.from('email_config').select('*').single();
        if (data) dbData = data;
    } catch(e) {}

    // Tentar LocalStorage
    let localData: any = {};
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.EMAIL_CONFIG);
        if(stored) localData = JSON.parse(stored);
    } catch(e) {}

    // Recuperar dados básicos
    const serviceId = dbData.service_id || localData.serviceId || '';
    const publicKey = dbData.public_key || localData.publicKey || '';
    const templates = { ...baseConfig.templates, ...(localData.templates || {}), ...(dbData.templates || {}) };
    const customErrorMessage = dbData.custom_error_message || localData.customErrorMessage || '';
    const customContent = { ...baseConfig.customContent, ...(localData.customContent || {}), ...(dbData.custom_content || {}) };

    // Recuperar Perfis
    let loadedProfiles: EmailConfigProfile[] = baseConfig.profiles;
    let loadedActiveIndex = localData.activeProfileIndex || 0;

    if (customContent._profiles_backup && Array.isArray(customContent._profiles_backup)) {
        loadedProfiles = customContent._profiles_backup;
    } else if (localData.profiles && Array.isArray(localData.profiles)) {
        loadedProfiles = localData.profiles;
    }

    // Populate Profile 0 if empty but legacy data exists
    if ((!loadedProfiles[0].serviceId) && serviceId) {
        loadedProfiles[0] = {
            serviceId: serviceId,
            publicKey: publicKey,
            templates: templates,
            isActive: true // Assume legacy single account is active
        };
    }

    // Migration: If isActive is not set on profiles, set based on loadedActiveIndex
    loadedProfiles = loadedProfiles.map((p, idx) => ({
        ...p,
        isActive: p.isActive !== undefined ? p.isActive : (idx === loadedActiveIndex)
    }));

    // Ensure 5 profiles
    while (loadedProfiles.length < 5) {
        loadedProfiles.push({ serviceId: '', publicKey: '', templates: { ...emptyTemplates }, isActive: false });
    }

    return {
        serviceId, 
        publicKey,
        templates,
        activeProfileIndex: loadedActiveIndex,
        profiles: loadedProfiles,
        customErrorMessage,
        customContent
    };
  },

  saveEmailConfig: async (config: EmailConfig) => {
    localStorage.setItem(STORAGE_KEYS.EMAIL_CONFIG, JSON.stringify(config));
    
    // Preparar dados para o Supabase
    // As colunas principais guardam o perfil "Selecionado na UI" (activeProfileIndex) apenas para fallback,
    // mas o array completo em custom_content é a fonte da verdade.
    const activeProfile = config.profiles[config.activeProfileIndex] || config.profiles[0];
    
    const customContentWithProfiles = {
        ...config.customContent,
        _profiles_backup: config.profiles 
    };

    try {
        await supabase.from('email_config').upsert({
            id: 'default_config', 
            service_id: activeProfile.serviceId, 
            public_key: activeProfile.publicKey,
            templates: activeProfile.templates,
            custom_error_message: config.customErrorMessage,
            custom_content: customContentWithProfiles
        });
    } catch (e) {}
  },

  // --- SYSTEM CONFIG ---
  getSystemConfig: async (): Promise<SystemConfig | null> => {
    let dbConfig: Partial<SystemConfig> = {};
    try {
        const { data } = await supabase.from('system_config').select('*').single();
        if(data) {
             // Fetch possible values
             const rawConfig: SystemConfig = {
                 logoUrl: data.logo_url,
                 faviconUrl: data.favicon_url,
                 platformName: data.platform_name,
                 pipedreamWebhookUrl: data.pipedream_webhook_url,
                 pipedreamDeleteUrl: data.pipedream_delete_url,
                 customMaterialTypes: data.custom_material_types
             };
             
             // Remove undefined properties to prevent overwriting local storage with undefined
             Object.keys(rawConfig).forEach(key => {
                 if (rawConfig[key as keyof SystemConfig] === undefined) {
                     delete rawConfig[key as keyof SystemConfig];
                 }
             });
             dbConfig = rawConfig;
        }
    } catch(e) {}

    let localConfig: SystemConfig = {};
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.SYSTEM_CONFIG);
        if(stored) localConfig = JSON.parse(stored);
    } catch(e) {}

    return { ...localConfig, ...dbConfig };
  },

  saveSystemConfig: async (config: SystemConfig) => {
      localStorage.setItem(STORAGE_KEYS.SYSTEM_CONFIG, JSON.stringify(config));
      try {
          await supabase.from('system_config').upsert({ 
              id: 'default_system_config',
              logo_url: config.logoUrl,
              favicon_url: config.faviconUrl,
              platform_name: config.platformName,
              pipedream_webhook_url: config.pipedreamWebhookUrl,
              pipedream_delete_url: config.pipedreamDeleteUrl, // New field mapping
              custom_material_types: config.customMaterialTypes
          });
      } catch (e) {}
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
      const users = await storageService.getUsers();
      const freshUser = users.find(u => u.id === sessionUser.id);
      
      if (freshUser) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
          return freshUser;
      } else {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          return null;
      }
  },
  
  getUserPermissions: async (user: User | null): Promise<string[]> => {
    if (!user) return [];
    
    // AUTOMATIC ADMIN PERMISSIONS:
    if (user.role === UserRole.ADMIN || user.roleId === 'role_admin') {
        return Object.values(PERMISSIONS);
    }
    
    const roles = await storageService.getRoles();
    
    // Determinar Role ID
    let roleId = user.roleId;
    if (!roleId) {
         // Fix: TypeScript knows user.role is not ADMIN here because of the early return above.
         // We safely cast to avoid type overlap error.
         if ((user.role as string) === UserRole.ADMIN) roleId = 'role_admin';
         else if (user.role === UserRole.EDITOR) roleId = 'role_editor';
         else roleId = 'role_aluno';
    }

    const userRole = roles.find(r => r.id === roleId);
    if (userRole) {
        return userRole.permissions;
    }
    return [];
  },

  login: async (email: string, password?: string): Promise<User> => {
    const normalizedEmail = email.trim().toLowerCase();
    
    // Tentar obter utilizadores (usando fallback se necessário)
    const users = await storageService.getUsers();
    
    let user = users.find(u => u.email === normalizedEmail);
    const isSuperAdmin = SUPER_ADMINS.includes(normalizedEmail);

    if (!user) {
      // Registo Automático de Admin se for o primeiro utilizador ou super admin
      const isFirstUser = users.length === 0;
      const shouldBeAdmin = isFirstUser || isSuperAdmin;

      if (shouldBeAdmin) {
           const newUser: User = {
            id: Date.now().toString(),
            email: normalizedEmail,
            name: normalizedEmail.split('@')[0],
            fullName: normalizedEmail.split('@')[0],
            role: UserRole.ADMIN, 
            roleId: 'role_admin',
            status: UserStatus.ACTIVE,
            allowedCourses: [],
            avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedEmail}`,
            password: password || '123456',
            mustChangePassword: false,
            emailVerified: true
          };
          await storageService.saveUser(newUser);
          user = newUser;
      } else {
          // Utilizador não existe e não é admin -> erro (deve registar-se)
           throw new Error("Utilizador não encontrado. Registe-se primeiro.");
      }
    } else {
        // Auto-reparação de Super Admin
        // Cast user.role to string/UserRole to avoid overlap error if TS thinks user.role excludes ADMIN
        if (isSuperAdmin && ((user.role as string) !== UserRole.ADMIN || user.status !== UserStatus.ACTIVE)) {
             user = { ...user, role: UserRole.ADMIN, roleId: 'role_admin', status: UserStatus.ACTIVE };
             await storageService.saveUser(user);
        }

        if (user.password && user.password !== password) {
            throw new Error("Senha incorreta.");
        }
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  },

  updatePassword: async (userId: string, newPassword: string): Promise<User | null> => {
    const users = await storageService.getUsers();
    const user = users.find(u => u.id === userId);
    
    if (user) {
        const updated = { ...user, password: newPassword, mustChangePassword: false };
        await storageService.saveUser(updated);
        
        const currentUser = storageService.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updated));
        }
        return updated;
    }
    return null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};