
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
  MANAGE_CONTENT: 'manage_content', // Materials View/List
  CREATE_MATERIAL: 'create_material', // Nova permissão específica para a página de criação
  VIEW_COURSES: 'view_courses',
  USE_AI_STUDIO: 'use_ai_studio',
  MANAGE_SETTINGS: 'manage_settings',
  USE_PIPEDREAM: 'use_pipedream',
  VIEW_LOGS: 'view_logs' // Nova permissão para ver registos
};

export const PERMISSION_LABELS: Record<string, string> = {
  [PERMISSIONS.VIEW_DASHBOARD]: 'Aceder ao Painel Principal (Dashboard)',
  [PERMISSIONS.MANAGE_USERS]: 'Gerir Utilizadores (Criar, Editar, Apagar)',
  [PERMISSIONS.MANAGE_ROLES]: 'Gerir Cargos e Permissões',
  [PERMISSIONS.MANAGE_CLASSES]: 'Gerir Turmas',
  [PERMISSIONS.MANAGE_COURSES]: 'Criar e Editar Cursos',
  [PERMISSIONS.MANAGE_CONTENT]: 'Ver e Gerir Lista de Conteúdos',
  [PERMISSIONS.CREATE_MATERIAL]: 'Criar/Editar Materiais (Acesso ao Editor Completo)',
  [PERMISSIONS.VIEW_COURSES]: 'Ver Cursos Disponíveis (Acesso Aluno)',
  [PERMISSIONS.USE_AI_STUDIO]: 'Utilizar Estúdio de Inteligência Artificial',
  [PERMISSIONS.MANAGE_SETTINGS]: 'Configurações de Sistema (Email, Branding)',
  [PERMISSIONS.USE_PIPEDREAM]: 'Utilizar Integrações (Upload Google Drive/Pipedream)',
  [PERMISSIONS.VIEW_LOGS]: 'Ver Registos de Auditoria (Ficheiros Apagados)'
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
  tempPasswordCreatedAt?: string; // Data de criação da senha temporária para validade de 48h
  resetPasswordToken?: string; // Token para link de redefinição
  resetPasswordExpires?: string; // Data de expiração do token
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
  type: string; // Alterado de MaterialType enum para string para permitir custom
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

export interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  size: number;
  uploadedBy: string; // User ID
  uploaderName: string; // User Name Snapshot
  uploadDate: string;
  context: 'material' | 'integration'; // Onde foi feito o upload
  driveFileId?: string; // ID real do ficheiro no Google Drive
  webViewLink?: string; // Link real para visualização
}

export interface FileDeletionLog {
  id: string;
  fileName: string;
  deletedBy: string; // User ID
  deletedByName: string; // Nome snapshot
  deletedAt: string;
  emailSent: boolean; // Se já foi incluído num lote de email
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

// CENTRALIZED EMAIL KEYS (VARIABLES)
// Isto evita strings "mágicas" espalhadas pelo código.
export const EMAIL_KEYS = {
    WELCOME: 'welcomeId',
    RESET_PASSWORD: 'resetPasswordId', // Admin Reset (New Password)
    RECOVERY: 'recoveryId', // Link de recuperação
    ENROLLMENT: 'enrollmentId',
    NOTIFICATION: 'notificationId',
    VERIFICATION: 'verificationId',
    AUDIT_LOG: 'auditLogId'
} as const;

// Nomes amigáveis para exibir na UI e Logs
export const EMAIL_KEY_LABELS: Record<string, string> = {
    [EMAIL_KEYS.WELCOME]: 'Boas-vindas',
    [EMAIL_KEYS.RESET_PASSWORD]: 'Nova Senha (Admin)',
    [EMAIL_KEYS.RECOVERY]: 'Link Recuperação Password',
    [EMAIL_KEYS.ENROLLMENT]: 'Inscrição Curso',
    [EMAIL_KEYS.NOTIFICATION]: 'Notificação Genérica',
    [EMAIL_KEYS.VERIFICATION]: 'Verificação Email',
    [EMAIL_KEYS.AUDIT_LOG]: 'Relatório Auditoria'
};

// Interface dinamica baseada nas chaves
export type EmailTemplates = Record<typeof EMAIL_KEYS[keyof typeof EMAIL_KEYS], string>;

export interface EmailCustomContent {
    welcomeText?: string;
    verificationText?: string;
    resetPasswordText?: string;
    recoveryEmailText?: string; 
    auditLogText?: string;
    enrollmentText?: string; // Novo
    notificationText?: string; // Novo
    _profiles_backup?: EmailConfigProfile[]; // Interno
}

export interface EmailConfigProfile {
    serviceId: string;
    publicKey: string;
    templates: EmailTemplates;
    isActive: boolean; // Support multiple active accounts
}

export interface EmailConfig {
  serviceId: string; // Legacy/Fallback
  publicKey: string; // Legacy/Fallback
  templates: EmailTemplates; // Legacy/Fallback
  
  // Multi-profile support
  activeProfileIndex: number; // Used for UI tab selection
  profiles: EmailConfigProfile[];

  customErrorMessage?: string; 
  customContent?: EmailCustomContent; 
}

export interface SystemConfig {
  logoUrl?: string;
  faviconUrl?: string;
  platformName?: string;
  pipedreamWebhookUrl?: string; // Upload URL
  pipedreamDeleteUrl?: string; // Novo campo: Delete URL
  customMaterialTypes?: string[]; // Novos tipos de material criados pelo utilizador
  tempPasswordValidityHours?: number; // Nova configuração de validade da senha
}
