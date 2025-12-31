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
    if (!config || !config.serviceId || !config.templateId || !config.publicKey) {
      throw new Error("Configuração incompleta. Verifique Service ID, Template ID e Public Key.");
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
        training_details: "Turma: Teste A\nCursos: Curso de Teste", // Exemplo para o teste
        password: "senha-de-teste", 
        
        from_name: SYSTEM_NAME,
        reply_to: SYSTEM_EMAIL,
      };

      console.log("Enviando Teste com Params:", templateParams);

      await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
      return { success: true };
    } catch (error: any) {
      console.error("EmailJS Error:", error);
      return { success: false, message: error?.text || error?.message || 'Erro desconhecido no envio.' };
    }
  },

  sendNotification: async (toName: string, message: string): Promise<boolean> => {
    const config = await storageService.getEmailConfig();
    if (!config) return false;
    
    try {
        await emailjs.send(config.serviceId, config.templateId, {
            to_name: toName,
            name: toName,
            message: message,
            training_details: "N/A",
            from_name: SYSTEM_NAME,
            reply_to: SYSTEM_EMAIL,
            to_email: SYSTEM_EMAIL,
            email: SYSTEM_EMAIL,
            password: 'N/A' 
        }, config.publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  },

  sendWelcomeEmail: async (toName: string, toEmail: string, tempPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    
    if (!config) return { success: false, message: "Configuração de Email inexistente." };
    if (!toEmail) return { success: false, message: "Email de destino vazio." };

    const cleanEmail = toEmail.trim();
    const trainingDetails = await getTrainingDetailsString(classId, courseIds);

    // Construímos o corpo da mensagem para funcionar mesmo que o utilizador use apenas {{message}} no template
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
        
        // Variáveis de destino
        to_email: cleanEmail, 
        user_email: cleanEmail, 
        email: cleanEmail,
        recipient: cleanEmail,
        to: cleanEmail,
        
        // Conteúdo
        message: messageBody, // Contém tudo concatenado por segurança
        training_details: trainingDetails, // Variável separada para templates avançados
        password: tempPass,
        
        // Remetente
        from_name: SYSTEM_NAME,
        reply_to: SYSTEM_EMAIL
    };

    try {
        console.log("A enviar email de boas-vindas para:", cleanEmail);
        await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
        return { success: true };
    } catch (e: any) {
        console.error("Erro Fatal EmailJS:", e);
        const errorMsg = e?.text || e?.message || JSON.stringify(e);
        return { success: false, message: errorMsg };
    }
  },

  sendPasswordReset: async (toName: string, toEmail: string, newPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const config = await storageService.getEmailConfig();
    if (!config) return { success: false, message: "Configuração de Email inexistente." };

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
        await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
        return { success: true };
    } catch (e: any) {
        console.error("Erro Fatal EmailJS:", e);
        const errorMsg = e?.text || e?.message || JSON.stringify(e);
        return { success: false, message: errorMsg };
    }
  }
};