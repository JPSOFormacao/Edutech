
export enum UserRole {
  // Mantemos o Enum para retrocompatibilidade, mas a lógica passará para RoleEntity
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  ALUNO = 'ALUNO'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED'
}

export enum MaterialType {
  DIAGNOSTICO = 'DIAGNOSTICO',
  AVALIACAO = 'AVALIACAO',
  TRABALHO = 'TRABALHO',
  RECURSO = 'RECURSO'
}

export enum TestimonialStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export const PERMISSIONS = {
  VIEW_DASHBOARD: 'view_dashboard',
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  MANAGE_CLASSES: 'manage_classes',
  MANAGE_COURSES: 'manage_courses',
  MANAGE_CONTENT: 'manage_content', // Materials, CMS
  VIEW_COURSES: 'view_courses',
  USE_AI_STUDIO: 'use_ai_studio',
  MANAGE_SETTINGS: 'manage_settings'
};

export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.VIEW_DASHBOARD]: 'Aceder ao Painel Principal (Dashboard)',
  [PERMISSIONS.MANAGE_USERS]: 'Gerir Utilizadores (Criar, Editar, Apagar)',
  [PERMISSIONS.MANAGE_ROLES]: 'Gerir Cargos e Permissões',
  [PERMISSIONS.MANAGE_CLASSES]: 'Gerir Turmas',
  [PERMISSIONS.MANAGE_COURSES]: 'Criar e Editar Cursos',
  [PERMISSIONS.MANAGE_CONTENT]: 'Gerir Conteúdos (Materiais e Páginas)',
  [PERMISSIONS.VIEW_COURSES]: 'Ver Cursos Disponíveis (Acesso Aluno)',
  [PERMISSIONS.USE_AI_STUDIO]: 'Utilizar Estúdio de Inteligência Artificial',
  [PERMISSIONS.MANAGE_SETTINGS]: 'Configurações de Sistema (Email, etc.)'
};

export interface RoleEntity {
  id: string;
  name: string;
  permissions: string[];
  isSystem?: boolean; // Se true, não pode ser apagado
}

export interface ClassEntity {
  id: string;
  name: string;
  description?: string;
}

export interface UserPrivacySettings {
  showEmail: boolean;
  showCourses: boolean;
  showBio: boolean;
}

export interface EnrollmentRequest {
  courseId: string;
  requestedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface User {
  id: string;
  email: string;
  name: string; // Nome de Exibição
  fullName?: string; // Nome Completo Real
  role: UserRole; // Legacy support
  roleId: string; // New dynamic role link
  status: UserStatus;
  allowedCourses: string[]; // Array of Course IDs
  enrollmentRequests?: EnrollmentRequest[]; // Novos pedidos de curso
  classId?: string; // Link to ClassEntity
  avatarUrl?: string;
  password?: string;
  mustChangePassword?: boolean;
  bio?: string;
  privacySettings?: UserPrivacySettings;
  emailVerified?: boolean; // Novo campo
  verificationToken?: string; // Novo campo
}

export interface Course {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  duration: string;
  price: number;
  syllabus?: string; // Conteúdo Programático
  requirements?: string; // Requisitos do Curso
  certificationInfo?: string; // Detalhes sobre o certificado
}

export interface Material {
  id: string;
  courseId: string;
  title: string;
  type: MaterialType;
  linkOrContent: string;
  createdAt: string;
}

export interface Page {
  slug: string;
  title: string;
  content: string; // HTML content
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  userId: string | null; // Pode ser null se o utilizador foi apagado
  userName: string; // Snapshot do nome
  userAvatar: string; // Snapshot do avatar
  role: string; // Texto livre, ex: "Aluno de Python"
  content: string;
  rating: number; // 1 to 5
  status: TestimonialStatus;
  createdAt: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

export interface EmailTemplates {
    welcomeId: string;
    resetPasswordId: string;
    enrollmentId: string;
    notificationId: string;
    verificationId?: string; // Novo template para verificação
}

export interface EmailConfig {
  serviceId: string;
  publicKey: string;
  templates: EmailTemplates;
}