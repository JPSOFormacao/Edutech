import { User, Course, Material, Page, UserRole, UserStatus, MaterialType, EmailConfig, RoleEntity, ClassEntity, PERMISSIONS } from '../types';

const STORAGE_KEYS = {
  USERS: 'edutech_users',
  COURSES: 'edutech_courses',
  MATERIALS: 'edutech_materials',
  PAGES: 'edutech_pages',
  ROLES: 'edutech_roles',
  CLASSES: 'edutech_classes',
  CURRENT_USER: 'edutech_current_user',
  EMAIL_CONFIG: 'edutech_email_config'
};

// --- Seed Data ---

const INITIAL_ROLES: RoleEntity[] = [
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

const INITIAL_CLASSES: ClassEntity[] = [
  { id: 'class_a', name: 'Turma A - 2024', description: 'Início em Janeiro' },
  { id: 'class_b', name: 'Turma B - 2024', description: 'Pós-Laboral' }
];

const INITIAL_USERS_SEED: User[] = [
  {
    id: '1',
    email: 'admin@edutech.pt',
    name: 'Administrador Principal',
    role: UserRole.ADMIN,
    roleId: 'role_admin',
    status: UserStatus.ACTIVE,
    allowedCourses: [],
    avatarUrl: 'https://picsum.photos/100/100',
    password: 'admin',
    mustChangePassword: false 
  },
  {
    id: '2',
    email: 'formador@edutech.pt',
    name: 'Formador Sénior',
    role: UserRole.EDITOR,
    roleId: 'role_editor',
    status: UserStatus.ACTIVE,
    allowedCourses: [],
    avatarUrl: 'https://picsum.photos/101/101',
    password: '123456',
    mustChangePassword: true
  },
  {
    id: '3',
    email: 'aluno@edutech.pt',
    name: 'João Aluno',
    role: UserRole.ALUNO,
    roleId: 'role_aluno',
    status: UserStatus.ACTIVE,
    allowedCourses: ['101'],
    classId: 'class_a',
    avatarUrl: 'https://picsum.photos/102/102',
    password: '123456',
    mustChangePassword: true
  },
  {
    id: '4',
    email: 'jpsoliveira.formacao@hotmail.com',
    name: 'JPS Oliveira',
    role: UserRole.ADMIN,
    roleId: 'role_admin',
    status: UserStatus.ACTIVE,
    allowedCourses: [],
    avatarUrl: 'https://ui-avatars.com/api/?name=J+O&background=4f46e5&color=fff',
    password: '123456',
    mustChangePassword: true
  }
];

const INITIAL_COURSES: Course[] = [
  {
    id: '101',
    title: 'Master em React & TypeScript',
    category: 'Desenvolvimento Web',
    description: 'Curso avançado para dominar o ecossistema React.',
    imageUrl: 'https://picsum.photos/400/250',
    duration: '40 Horas',
    price: 499.00
  },
  {
    id: '102',
    title: 'Inteligência Artificial com Gemini',
    category: 'AI & Machine Learning',
    description: 'Aprenda a integrar modelos LLM em aplicações web.',
    imageUrl: 'https://picsum.photos/400/251',
    duration: '25 Horas',
    price: 299.50
  }
];

const INITIAL_MATERIALS: Material[] = [
  {
    id: 'm1',
    courseId: '101',
    title: 'Ficha de Diagnóstico Inicial',
    type: MaterialType.DIAGNOSTICO,
    linkOrContent: '#',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_PAGES: Page[] = [
  {
    slug: 'regulamento',
    title: 'Regulamento Interno',
    content: '<h1>Regulamento EduTech PT</h1><p>Todos os alunos devem cumprir...</p>',
    updatedAt: new Date().toISOString()
  }
];

// Helper to initialize storage and CLEAN DUPLICATES
const initStorage = () => {
  // Roles & Classes
  if (!localStorage.getItem(STORAGE_KEYS.ROLES)) {
    localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(INITIAL_ROLES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CLASSES)) {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(INITIAL_CLASSES));
  }

  // Users Initialization & Migration
  const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
  let users: User[] = storedUsers ? JSON.parse(storedUsers) : [];

  if (users.length === 0) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS_SEED));
  } else {
    // 1. Migration: ensure existing users have password fields and roleId
    let changed = false;
    users = users.map(u => {
      let modified = { ...u };
      if (!modified.password) {
        modified.password = '123456';
        modified.mustChangePassword = true;
        changed = true;
      }
      if (!modified.roleId) {
        // Map old Enum to new Role ID
        if (modified.role === UserRole.ADMIN) modified.roleId = 'role_admin';
        else if (modified.role === UserRole.EDITOR) modified.roleId = 'role_editor';
        else modified.roleId = 'role_aluno';
        changed = true;
      }
      // Ensure email is always lowercase
      if (modified.email !== modified.email.toLowerCase()) {
          modified.email = modified.email.toLowerCase();
          changed = true;
      }
      return modified;
    });

    // 2. CRITICAL FIX: Remove duplicate PENDING users if an ACTIVE user exists with same email
    const uniqueUsersMap = new Map<string, User>();
    const usersToKeep: User[] = [];
    
    // Sort users: Active users come first, then others. This ensures map prefers Active.
    const sortedUsers = [...users].sort((a, b) => {
        if (a.status === UserStatus.ACTIVE && b.status !== UserStatus.ACTIVE) return -1;
        if (a.status !== UserStatus.ACTIVE && b.status === UserStatus.ACTIVE) return 1;
        return 0;
    });

    sortedUsers.forEach(u => {
        const email = u.email.trim().toLowerCase();
        if (!uniqueUsersMap.has(email)) {
            uniqueUsersMap.set(email, u);
            usersToKeep.push(u);
        } else {
            // Duplicate found. Since we sorted Active first, this duplicate is likely the Pending one we want to discard.
            console.log(`Removing duplicate/pending user for email: ${email}`);
            changed = true;
        }
    });

    if (changed || users.length !== usersToKeep.length) {
        users = usersToKeep;
        
        // Add default admin if missing after cleanup (safety check)
        const newAdminEmail = 'jpsoliveira.formacao@hotmail.com';
        const hasNewAdmin = users.find(u => u.email === newAdminEmail);
        if (!hasNewAdmin) {
           const newAdminUser = INITIAL_USERS_SEED.find(u => u.email === newAdminEmail);
           if (newAdminUser) users.push(newAdminUser);
        }
        
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }
  }

  // Other entities
  if (!localStorage.getItem(STORAGE_KEYS.COURSES)) {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MATERIALS)) {
    localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(INITIAL_MATERIALS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PAGES)) {
    localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(INITIAL_PAGES));
  }
};

initStorage();

export const storageService = {
  // Users
  getUsers: (): User[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
  saveUsers: (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),
  
  // Roles
  getRoles: (): RoleEntity[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.ROLES) || '[]'),
  saveRoles: (roles: RoleEntity[]) => localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(roles)),

  // Classes
  getClasses: (): ClassEntity[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '[]'),
  saveClasses: (classes: ClassEntity[]) => localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes)),

  // Courses
  getCourses: (): Course[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.COURSES) || '[]'),
  saveCourses: (courses: Course[]) => localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses)),

  // Materials
  getMaterials: (): Material[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.MATERIALS) || '[]'),
  saveMaterials: (materials: Material[]) => localStorage.setItem(STORAGE_KEYS.MATERIALS, JSON.stringify(materials)),

  // Pages
  getPages: (): Page[] => JSON.parse(localStorage.getItem(STORAGE_KEYS.PAGES) || '[]'),
  savePages: (pages: Page[]) => localStorage.setItem(STORAGE_KEYS.PAGES, JSON.stringify(pages)),

  // Email Config
  getEmailConfig: (): EmailConfig | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.EMAIL_CONFIG);
    return stored ? JSON.parse(stored) : null;
  },
  saveEmailConfig: (config: EmailConfig) => localStorage.setItem(STORAGE_KEYS.EMAIL_CONFIG, JSON.stringify(config)),

  // Auth Simulation
  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!stored) return null;
    
    const sessionUser = JSON.parse(stored) as User;
    const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]') as User[];
    
    // 1. Tenta encontrar o utilizador pelo ID exato
    let freshUser = allUsers.find(u => u.id === sessionUser.id);
    
    // 2. CORREÇÃO INTELIGENTE DE SESSÃO:
    // Se o utilizador atual não existir ou estiver PENDING, mas existir um utilizador ATIVO com o mesmo email,
    // o sistema assume que houve uma duplicação e "promove" a sessão para o utilizador correto (Ativo).
    if (!freshUser || (freshUser.status === UserStatus.PENDING)) {
        const email = (freshUser?.email || sessionUser.email).trim().toLowerCase();
        
        // Procura a "melhor" versão deste utilizador
        const betterMatch = allUsers.find(u => 
            u.email.trim().toLowerCase() === email && 
            u.status === UserStatus.ACTIVE
        );

        if (betterMatch) {
            console.log("Correção de Sessão: Trocando utilizador Pendente por Ativo encontrado.");
            freshUser = betterMatch;
            // Atualiza o storage imediatamente
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
        }
    }
    
    // Se mesmo assim não existir ou continuar pendente sem alternativa, mantemos a lógica normal
    if (!freshUser) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return null;
    }

    // Sync se houve alterações de dados (roles, etc)
    if (JSON.stringify(freshUser) !== stored) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
    }
    
    return freshUser;
  },
  
  // Permission Helper
  getUserPermissions: (user: User | null): string[] => {
    if (!user) return [];
    const roles = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROLES) || '[]') as RoleEntity[];
    
    // Fallback: If roleId is missing (legacy session), try to map from old role enum
    let roleId = user.roleId;
    if (!roleId) {
         if (user.role === UserRole.ADMIN) roleId = 'role_admin';
         else if (user.role === UserRole.EDITOR) roleId = 'role_editor';
         else roleId = 'role_aluno';
    }

    const userRole = roles.find(r => r.id === roleId);
    // Return permissions or empty array
    return userRole ? userRole.permissions : [];
  },

  login: (email: string, password?: string): User => {
    // Normalizar email para evitar duplicação por Case Sensitivity
    const normalizedEmail = email.trim().toLowerCase();
    const users = storageService.getUsers();
    
    // 1. Encontrar todos com este email
    const matches = users.filter(u => u.email.trim().toLowerCase() === normalizedEmail);
    
    // 2. Preferir conta ATIVA. Se houver duplicados, pega a ativa.
    let user = matches.find(u => u.status === UserStatus.ACTIVE) || matches[0];
    
    if (!user) {
      // Auto-register as PENDING
      user = {
        id: Date.now().toString(),
        email: normalizedEmail, // Save as lowercase
        name: normalizedEmail.split('@')[0],
        role: UserRole.ALUNO, 
        roleId: 'role_aluno', // Default
        status: UserStatus.PENDING,
        allowedCourses: [],
        avatarUrl: `https://ui-avatars.com/api/?name=${normalizedEmail}&background=random`,
        password: password || '123456',
        mustChangePassword: false
      };
      users.push(user);
      storageService.saveUsers(users);
    } else {
        // Verify password
        if (user.password && user.password !== password) {
            throw new Error("Senha incorreta.");
        }
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  },

  updatePassword: (userId: string, newPassword: string): User | null => {
    const users = storageService.getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return null;
    
    const updatedUser = { 
        ...users[userIndex], 
        password: newPassword, 
        mustChangePassword: false 
    };
    
    users[userIndex] = updatedUser;
    storageService.saveUsers(users);
    
    // Update current session if it's the same user
    const currentUser = storageService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    }

    return updatedUser;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};