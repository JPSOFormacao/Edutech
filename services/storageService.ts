import { User, Course, Material, Page, UserRole, UserStatus, MaterialType, EmailConfig } from '../types';

const STORAGE_KEYS = {
  USERS: 'edutech_users',
  COURSES: 'edutech_courses',
  MATERIALS: 'edutech_materials',
  PAGES: 'edutech_pages',
  CURRENT_USER: 'edutech_current_user',
  EMAIL_CONFIG: 'edutech_email_config'
};

// Initial Seed Data
const INITIAL_USERS: User[] = [
  {
    id: '1',
    email: 'admin@edutech.pt',
    name: 'Administrador Principal',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    allowedCourses: [],
    avatarUrl: 'https://picsum.photos/100/100'
  },
  {
    id: '2',
    email: 'formador@edutech.pt',
    name: 'Formador Sénior',
    role: UserRole.EDITOR,
    status: UserStatus.ACTIVE,
    allowedCourses: [],
    avatarUrl: 'https://picsum.photos/101/101'
  },
  {
    id: '3',
    email: 'aluno@edutech.pt',
    name: 'João Aluno',
    role: UserRole.ALUNO,
    status: UserStatus.ACTIVE,
    allowedCourses: ['101'], // Access to React Course
    avatarUrl: 'https://picsum.photos/102/102'
  },
  {
    id: '4',
    email: 'jpsoliveira.formacao@hotmail.com',
    name: 'JPS Oliveira',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
    allowedCourses: [],
    avatarUrl: 'https://ui-avatars.com/api/?name=J+O&background=4f46e5&color=fff'
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
  // Users Initialization & Migration
  const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
  let users: User[] = storedUsers ? JSON.parse(storedUsers) : [];

  if (users.length === 0) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  } else {
    // Check if new admins need to be added to existing storage
    const newAdminEmail = 'jpsoliveira.formacao@hotmail.com';
    const hasNewAdmin = users.find(u => u.email === newAdminEmail);
    if (!hasNewAdmin) {
      const newAdminUser = INITIAL_USERS.find(u => u.email === newAdminEmail);
      if (newAdminUser) {
        users.push(newAdminUser);
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }
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
    return stored ? JSON.parse(stored) : null;
  },
  login: (email: string): User => {
    const users = storageService.getUsers();
    let user = users.find(u => u.email === email);
    
    if (!user) {
      // Auto-register as PENDING
      user = {
        id: Date.now().toString(),
        email,
        name: email.split('@')[0],
        role: UserRole.ALUNO, // Default role
        status: UserStatus.PENDING,
        allowedCourses: [],
        avatarUrl: `https://ui-avatars.com/api/?name=${email}&background=random`
      };
      users.push(user);
      storageService.saveUsers(users);
    }
    
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return user;
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};