import emailjs from '@emailjs/browser';
import { storageService } from './storageService';
import { EmailTemplates } from '../types';

interface EmailResult {
    success: boolean;
    message?: string;
}

// Email oficial do sistema
const SYSTEM_EMAIL = 'EduTechPT@hotmail.com';
const SYSTEM_NAME = 'EduTech PT Formação';

// Helper para gerar o texto de detalhes da formação
const getTrainingDetailsString = async (classId?: string, courseIds?: string[]): Promise<string> => {
    const classes = await storageService.getClasses();
    const courses = await storageService.getCourses();

    let detailsParts = [];
    let hasInfo = false;

    // Verificar Turma
    if (classId) {
        const cls = classes.find(c => c.id === classId);
        if (cls) {
            detailsParts.push(`Turma: ${cls.name}`);
            hasInfo = true;
        }
    }

    // Verificar Cursos
    if (courseIds && courseIds.length > 0) {
        const courseNames = courses
            .filter(c => courseIds.includes(c.id))
            .map(c => c.title);
        
        if (courseNames.length > 0) {
            detailsParts.push(`Cursos Inscritos: ${courseNames.join(', ')}`);
            hasInfo = true;
        }
    }

    if (!hasInfo) {
        return "A turma e/ou o curso será atribuída posteriormente pelo Formador";
    }

    return detailsParts.join('\n');
};

export const emailService = {
  // Teste Genérico (Mantido para retrocompatibilidade)
  sendTestEmail: async (): Promise<EmailResult> => {
    return emailService.sendSpecificTemplateTest('welcomeId');
  },

  // NOVO: Teste Específico por Tipo de Template
  sendSpecificTemplateTest: async (templateKey: keyof EmailTemplates): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    
    // Validações Básicas
    if (!config) return { success: false, message: "Configuração não encontrada." };
    if (!config.serviceId) return { success: false, message: "Service ID em falta." };
    if (!config.publicKey) return { success: false, message: "Public Key em falta." };

    // Tenta obter o ID específico. Se não existir, tenta o fallback geral 'welcomeId' ou o primeiro disponível
    let templateId = config.templates?.[templateKey];
    
    // Lógica de Fallback visual para o teste:
    // Se o utilizador está a testar o botão "Verificação" mas não tem ID lá,
    // avisamos que vai falhar ou tentamos usar o fallback se a lógica do sistema assim o permitir.
    // Neste caso, para ser fiel ao teste, se o campo está vazio, deve dar erro ou avisar.
    if (!templateId) {
        return { success: false, message: `O campo para este template está vazio. Guarde um ID antes de testar.` };
    }

    // Dados Fictícios para o Teste
    const commonParams = {
        to_name: "Administrador (Teste)",
        name: "Administrador (Teste)",
        to_email: SYSTEM_EMAIL, // EduTechPT@hotmail.com
        user_email: SYSTEM_EMAIL,
        email: SYSTEM_EMAIL,
        from_name: SYSTEM_NAME,
        reply_to: SYSTEM_EMAIL
    };

    let specificParams = {};

    switch (templateKey) {
        case 'verificationId':
            specificParams = {
                message: "Este é um email de teste para validar o template de Verificação de Conta.",
                verification_link: "https://edutech.pt/#/verify-email?token=TESTE-TOKEN-123"
            };
            break;
        case 'resetPasswordId':
            specificParams = {
                message: "Este é um email de teste para validar o template de Recuperação de Senha.",
                password: "nova-senha-teste-123",
                training_details: "Cursos: Exemplo de Curso Python"
            };
            break;
        case 'notificationId':
            specificParams = {
                message: "Esta é uma notificação de teste do sistema EduTech PT.",
                training_details: "N/A"
            };
            break;
        case 'enrollmentId':
            specificParams = {
                message: "O utilizador inscreveu-se no curso: Desenvolvimento Web (Teste).",
                course_name: "Desenvolvimento Web Fullstack",
                student_name: "Aluno Teste"
            };
            break;
        case 'welcomeId':
        default:
            specificParams = {
                message: "Bem-vindo à EduTech PT! A sua conta foi criada com sucesso.",
                password: "senha-inicial-teste",
                training_details: "Turma: Demo\nCursos: Introdução à IA"
            };
            break;
    }

    const templateParams = { ...commonParams, ...specificParams };

    try {
      console.log(`A enviar teste (${templateKey}) para ${SYSTEM_EMAIL} usando ID: ${templateId}`);
      await emailjs.send(config.serviceId, templateId, templateParams, config.publicKey);
      return { success: true };
    } catch (error: any) {
      console.error("EmailJS Error:", error);
      return { success: false, message: error?.text || error?.message || 'Erro desconhecido no envio.' };
    }
  },

  sendNotification: async (toName: string, message: string, toEmail: string = SYSTEM_EMAIL): Promise<boolean> => {
    const config = await storageService.getEmailConfig();
    // Tenta ID específico, depois fallback genérico
    let templateId = config?.templates?.notificationId || (config as any)?.templateId;
    
    if (!templateId && config?.templates) {
        const anyTemplate = Object.values(config.templates).find(v => v && typeof v === 'string' && v.length > 0);
        if (anyTemplate) templateId = anyTemplate;
    }

    if (!config || !templateId || !config.serviceId || !config.publicKey) return false;
    
    try {
        await emailjs.send(config.serviceId, templateId, {
            to_name: toName,
            name: toName,
            message: message,
            training_details: "N/A",
            from_name: SYSTEM_NAME,
            reply_to: SYSTEM_EMAIL,
            to_email: toEmail, 
            email: toEmail,
            password: 'N/A' 
        }, config.publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  },

  sendVerificationEmail: async (toName: string, toEmail: string, verificationLink: string): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    
    // VALIDACAO DETALHADA PARA DEBUG
    if (!config) return { success: false, message: "Erro de Configuração: Configuração de email vazia." };
    
    if (!config.serviceId) {
        return { success: false, message: "Erro de Configuração: Falta configurar o Service ID." };
    }
    
    if (!config.publicKey) {
        return { success: false, message: "Erro de Configuração: Falta configurar a Public Key." };
    }

    // Estratégia de Fallback em Cascata
    // 1. Tenta o ID específico de verificação
    // 2. Tenta o ID de notificação
    // 3. Tenta o ID de boas-vindas
    // 4. Tenta o ID legado na raiz
    // 5. Tenta QUALQUER string que esteja no objeto templates (Fallback Supremo)
    let templateId = config.templates?.verificationId || 
                     config.templates?.notificationId || 
                     config.templates?.welcomeId || 
                     (config as any)?.templateId;

    if (!templateId && config.templates) {
         // Procura qualquer valor preenchido
         const fallback = Object.values(config.templates).find(v => v && typeof v === 'string' && v.trim().length > 0);
         if (fallback) templateId = fallback;
    }

    if (!templateId) {
         return { success: false, message: "Erro de Configuração: Nenhum Template ID encontrado. Por favor configure pelo menos UM template (ex: Boas-vindas) nas definições." };
    }
    
    // Constrói uma mensagem HTML com botão
    const messageBody = `
      Olá ${toName},
      
      Obrigado pelo seu registo na EduTech PT.
      Por favor confirme o seu endereço de email clicando no link abaixo:
      
      ${verificationLink}
      
      Após a verificação, a sua conta ficará pendente de aprovação por um Administrador.
    `;

    try {
        await emailjs.send(config.serviceId, templateId, {
            to_name: toName,
            name: toName,
            to_email: toEmail,
            email: toEmail,
            message: messageBody, 
            from_name: SYSTEM_NAME,
            reply_to: SYSTEM_EMAIL,
            verification_link: verificationLink 
        }, config.publicKey);
        return { success: true };
    } catch (e: any) {
        console.error("Erro Email Verificação:", e);
        return { success: false, message: `Erro EmailJS: ${e?.text || e?.message || 'Falha de envio'}` };
    }
  },

  sendWelcomeEmail: async (toName: string, toEmail: string, tempPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    let templateId = config?.templates?.welcomeId || (config as any)?.templateId;
    
    // Fallback Supremo
    if (!templateId && config?.templates) {
         const fallback = Object.values(config.templates).find(v => v && typeof v === 'string' && v.trim().length > 0);
         if (fallback) templateId = fallback;
    }
    
    if (!config) return { success: false, message: "Configuração de email vazia." };
    if (!templateId) return { success: false, message: "Nenhum Template ID configurado." };
    if (!toEmail) return { success: false, message: "Email de destino vazio." };

    const cleanEmail = toEmail.trim();
    const trainingDetails = await getTrainingDetailsString(classId, courseIds);

    const messageBody = `
      Bem-vindo à EduTech PT!
      
      A sua conta foi criada com sucesso.
      
      ${trainingDetails}
      
      As suas credenciais de acesso são:
      Email: ${cleanEmail}
      Senha Temporária: ${tempPass}
      
      Por favor, aceda à plataforma e altere a sua senha no primeiro login.
    `;

    const templateParams = {
        to_name: toName,
        name: toName,
        to_email: cleanEmail, 
        user_email: cleanEmail, 
        email: cleanEmail,
        recipient: cleanEmail,
        to: cleanEmail,
        message: messageBody,
        training_details: trainingDetails,
        password: tempPass,
        from_name: SYSTEM_NAME,
        reply_to: SYSTEM_EMAIL
    };

    try {
        await emailjs.send(config.serviceId, templateId, templateParams, config.publicKey);
        return { success: true };
    } catch (e: any) {
        console.error("Erro Fatal EmailJS:", e);
        return { success: false, message: e?.text || e?.message || JSON.stringify(e) };
    }
  },

  sendPasswordReset: async (toName: string, toEmail: string, newPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    let templateId = config?.templates?.resetPasswordId || (config as any)?.templateId;
    
    // Fallback Supremo
    if (!templateId && config?.templates) {
         const fallback = Object.values(config.templates).find(v => v && typeof v === 'string' && v.trim().length > 0);
         if (fallback) templateId = fallback;
    }

    if (!config || !templateId) return { success: false, message: "Nenhum Template ID configurado." };

    if (!toEmail) return { success: false, message: "Email de destino vazio." };
    const cleanEmail = toEmail.trim();
    const trainingDetails = await getTrainingDetailsString(classId, courseIds);
    
    const messageBody = `
      Olá ${toName},

      A sua senha de acesso à plataforma EduTech PT foi redefinida.
      
      ${trainingDetails}

      Novas credenciais:
      Email: ${cleanEmail}
      Nova Senha: ${newPass}
    `;

    const templateParams = {
        to_name: toName,
        name: toName,
        to_email: cleanEmail, 
        user_email: cleanEmail, 
        email: cleanEmail,
        recipient: cleanEmail,
        to: cleanEmail,
        message: messageBody,
        training_details: trainingDetails,
        password: newPass,
        from_name: SYSTEM_NAME,
        reply_to: SYSTEM_EMAIL
    };

    try {
        await emailjs.send(config.serviceId, templateId, templateParams, config.publicKey);
        return { success: true };
    } catch (e: any) {
        console.error("Erro Fatal EmailJS:", e);
        return { success: false, message: e?.text || e?.message || JSON.stringify(e) };
    }
  }
};