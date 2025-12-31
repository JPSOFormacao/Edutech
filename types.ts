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

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole; // Legacy support
  roleId: string; // New dynamic role link
  status: UserStatus;
  allowedCourses: string[]; // Array of Course IDs
  classId?: string; // Link to ClassEntity
  avatarUrl?: string;
  password?: string;
  mustChangePassword?: boolean;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  duration: string;
  price: number;
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

export interface EmailConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}