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

// Helper to initialize storage
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
    // Migration: ensure existing users have password fields and roleId
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
      return modified;
    });

    // Check if new admins need to be added to existing storage
    const newAdminEmail = 'jpsoliveira.formacao@hotmail.com';
    const hasNewAdmin = users.find(u => u.email === newAdminEmail);
    if (!hasNewAdmin) {
      const newAdminUser = INITIAL_USERS_SEED.find(u => u.email === newAdminEmail);
      if (newAdminUser) {
        users.push(newAdminUser);
        changed = true;
      }
    }

    if (changed) {
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
    
    // Get fresh data from Users list to ensure permissions/roles are up to date
    const sessionUser = JSON.parse(stored) as User;
    const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]') as User[];
    const freshUser = allUsers.find(u => u.id === sessionUser.id);
    
    // If user was deleted or not found, logout effectively
    if (!freshUser) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return null;
    }

    // Update session storage if data is stale (e.g. roleId added)
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
    const users = storageService.getUsers();
    let user = users.find(u => u.email === email);
    
    if (!user) {
      // Auto-register as PENDING
      user = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0],
        role: UserRole.ALUNO, 
        roleId: 'role_aluno', // Default
        status: UserStatus.PENDING,
        allowedCourses: [],
        avatarUrl: `https://ui-avatars.com/api/?name=${email}&background=random`,
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