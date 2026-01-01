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
    try {
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
    } catch (e) {
        console.warn("Erro ao obter detalhes de formação para email:", e);
        return "Detalhes de formação indisponíveis.";
    }
};

const getErrorMsg = async (originalError: any): Promise<string> => {
    const config = await storageService.getEmailConfig();
    const techError = originalError?.text || originalError?.message || 'Erro desconhecido';
    
    if (config?.customErrorMessage) {
        return `${config.customErrorMessage} [Detalhe Técnico: ${techError}]`;
    }
    return techError;
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

    let templateId = config.templates?.[templateKey];
    
    // Se o campo específico estiver vazio, alertamos o utilizador, mas tentamos o fallback para demonstração se for Welcome
    if (!templateId) {
        if (templateKey === 'welcomeId') {
             // Tenta encontrar qualquer um para o teste genérico
             const any = Object.values(config.templates || {}).find(v => v);
             if (any) templateId = any;
             else return { success: false, message: "Nenhum template configurado." };
        } else {
             return { success: false, message: `O ID para '${templateKey}' está vazio. Guarde uma configuração válida primeiro.` };
        }
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
    
    // Obter o URL base atual (ex: http://localhost:5173 ou https://meu-site.com)
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://edutech.pt';

    switch (templateKey) {
        case 'verificationId':
            specificParams = {
                message: "Email de teste para Validação de Conta.",
                // Correção: Usa o URL atual do browser
                verification_link: `${baseUrl}/#/verify-email?token=TESTE-TOKEN-123`
            };
            break;
        case 'resetPasswordId':
            specificParams = {
                message: "Email de teste para Recuperação de Senha.",
                password: "nova-senha-teste-123",
                training_details: "Cursos: Exemplo de Curso Python"
            };
            break;
        case 'notificationId':
            specificParams = {
                message: "Notificação de teste do sistema.",
                training_details: "N/A"
            };
            break;
        case 'enrollmentId':
            specificParams = {
                message: "Inscrição no curso: Desenvolvimento Web (Teste).",
                course_name: "Desenvolvimento Web Fullstack",
                student_name: "Aluno Teste"
            };
            break;
        case 'welcomeId':
        default:
            specificParams = {
                message: "Bem-vindo à EduTech PT! Conta criada com sucesso.",
                password: "senha-inicial-teste",
                training_details: "Turma: Demo\nCursos: Introdução à IA"
            };
            break;
    }

    const templateParams = { ...commonParams, ...specificParams };

    try {
      console.log(`[EmailTest] Envio para ${SYSTEM_EMAIL} | Template: ${templateKey} (${templateId})`);
      await emailjs.send(config.serviceId, templateId, templateParams, config.publicKey);
      return { success: true };
    } catch (error: any) {
      console.error("EmailJS Error:", error);
      const msg = await getErrorMsg(error);
      return { success: false, message: msg };
    }
  },

  sendNotification: async (toName: string, message: string, toEmail: string = SYSTEM_EMAIL): Promise<boolean> => {
    const config = await storageService.getEmailConfig();
    let templateId = config?.templates?.notificationId;
    
    // Fallback
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
    
    if (!config) return { success: false, message: "Erro Config: Objeto vazio." };
    if (!config.serviceId) return { success: false, message: "Erro Config: Service ID em falta." };
    if (!config.publicKey) return { success: false, message: "Erro Config: Public Key em falta." };

    // Estratégia de Fallback
    let templateId = config.templates?.verificationId || 
                     config.templates?.notificationId || 
                     config.templates?.welcomeId || 
                     (config as any)?.templateId;

    if (!templateId && config.templates) {
         const fallback = Object.values(config.templates).find(v => v && typeof v === 'string' && v.trim().length > 0);
         if (fallback) templateId = fallback;
    }

    if (!templateId) {
         return { success: false, message: "Erro de Configuração: Nenhum Template ID encontrado. Configure pelo menos UM template (ex: Boas-vindas)." };
    }
    
    const messageBody = `
      Olá ${toName},
      
      Obrigado pelo seu registo na EduTech PT.
      Por favor confirme o seu endereço de email clicando no link abaixo:
      
      ${verificationLink}
      
      Após a verificação, a sua conta ficará pendente de aprovação.
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
        const msg = await getErrorMsg(e);
        return { success: false, message: msg };
    }
  },

  sendWelcomeEmail: async (toName: string, toEmail: string, tempPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    let templateId = config?.templates?.welcomeId || (config as any)?.templateId;
    
    if (!templateId && config?.templates) {
         const fallback = Object.values(config.templates).find(v => v && typeof v === 'string' && v.trim().length > 0);
         if (fallback) templateId = fallback;
    }
    
    if (!config || !templateId) return { success: false, message: "Template ID em falta." };

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
        const msg = await getErrorMsg(e);
        return { success: false, message: msg };
    }
  },

  sendPasswordReset: async (toName: string, toEmail: string, newPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    let templateId = config?.templates?.resetPasswordId || (config as any)?.templateId;
    
    if (!templateId && config?.templates) {
         const fallback = Object.values(config.templates).find(v => v && typeof v === 'string' && v.trim().length > 0);
         if (fallback) templateId = fallback;
    }

    if (!config || !templateId) return { success: false, message: "Template ID em falta." };

    const cleanEmail = toEmail.trim();
    const trainingDetails = await getTrainingDetailsString(classId, courseIds);
    
    const messageBody = `
      Olá ${toName},
      A sua senha foi redefinida.
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
        const msg = await getErrorMsg(e);
        return { success: false, message: msg };
    }
  }
};