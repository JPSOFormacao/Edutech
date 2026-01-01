import emailjs from '@emailjs/browser';
import { storageService } from './storageService';

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

    // Lógica solicitada: Se não houver atribuição, mostrar texto específico
    if (!hasInfo) {
        return "A turma e/ou o curso será atribuída posteriormente pelo Formador";
    }

    return detailsParts.join('\n');
};

export const emailService = {
  sendTestEmail: async (): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    
    // Tenta usar o template de welcome como default para teste, ou o genérico antigo
    const templateId = config?.templates?.welcomeId || (config as any)?.templateId;
    
    console.log("Teste de Email - Config Carregada:", config);

    if (!config) {
        return { success: false, message: "Objeto de configuração é nulo." };
    }
    if (!config.serviceId) {
         return { success: false, message: "Service ID em falta nas configurações." };
    }
    if (!config.publicKey) {
         return { success: false, message: "Public Key em falta nas configurações." };
    }
    if (!templateId) {
         return { success: false, message: "Template ID (Boas-vindas) em falta. Configure pelo menos o template de Boas-vindas." };
    }

    const currentUser = storageService.getCurrentUser();
    const userEmail = currentUser?.email || SYSTEM_EMAIL;

    try {
      const templateParams = {
        to_name: "Administrador (Teste)",
        name: "Administrador (Teste)",
        
        // Variaveis de Destinatário
        to_email: userEmail,
        user_email: userEmail,
        email: userEmail,
        recipient: userEmail,
        to: userEmail,

        // Conteúdo
        message: "O sistema de email está configurado e operacional.",
        training_details: "Turma: Teste A\nCursos: Curso de Teste", 
        password: "senha-de-teste", 
        
        from_name: SYSTEM_NAME,
        reply_to: SYSTEM_EMAIL,
      };

      await emailjs.send(config.serviceId, templateId, templateParams, config.publicKey);
      return { success: true };
    } catch (error: any) {
      console.error("EmailJS Error:", error);
      return { success: false, message: error?.text || error?.message || 'Erro desconhecido no envio.' };
    }
  },

  sendNotification: async (toName: string, message: string, toEmail: string = SYSTEM_EMAIL): Promise<boolean> => {
    const config = await storageService.getEmailConfig();
    const templateId = config?.templates?.notificationId || (config as any)?.templateId;
    
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

    // Tenta encontrar ID de verificação, senão usa notificação ou welcome como fallback
    const templateId = config.templates?.verificationId || 
                       config.templates?.notificationId || 
                       config.templates?.welcomeId || 
                       (config as any)?.templateId;

    if (!templateId) {
         return { success: false, message: "Erro de Configuração: Nenhum Template ID encontrado. Configure o template de 'Verificação' ou 'Boas-vindas'." };
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
    const templateId = config?.templates?.welcomeId || (config as any)?.templateId;
    
    if (!config) return { success: false, message: "Configuração de email vazia." };
    if (!templateId) return { success: false, message: "Template de Boas-vindas não configurado." };
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
    const templateId = config?.templates?.resetPasswordId || (config as any)?.templateId;
    
    if (!config || !templateId) return { success: false, message: "Template de Reset de Senha não configurado." };

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