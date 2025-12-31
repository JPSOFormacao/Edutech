export enum UserRole {
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  allowedCourses: string[]; // Array of Course IDs
  avatarUrl?: string;
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