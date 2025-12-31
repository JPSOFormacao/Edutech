
import emailjs from '@emailjs/browser';
import { storageService } from './storageService';

interface EmailResult {
    success: boolean;
    message?: string;
}

// Email oficial do sistema
const SYSTEM_EMAIL = 'EduTechPT@hotmail.com';
const SYSTEM_NAME = 'EduTech PT Formação';

export const emailService = {
  sendTestEmail: async (): Promise<EmailResult> => {
    const config = storageService.getEmailConfig();
    if (!config || !config.serviceId || !config.templateId || !config.publicKey) {
      throw new Error("Configuração incompleta. Verifique Service ID, Template ID e Public Key.");
    }

    const currentUser = storageService.getCurrentUser();
    // Preferência: Email do utilizador logado, senão usa o email do sistema
    const userEmail = currentUser?.email || SYSTEM_EMAIL;

    try {
      const templateParams = {
        to_name: "Administrador (Teste)",
        name: "Administrador (Teste)", // Suporte para {{name}}
        
        // Variaveis de Destinatário
        to_email: userEmail,
        user_email: userEmail,
        email: userEmail,
        recipient: userEmail,
        to: userEmail,

        // Conteúdo
        message: "O sistema de email está configurado e operacional com a conta EduTechPT@hotmail.com.",
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
    const config = storageService.getEmailConfig();
    if (!config) return false;

    const currentUser = storageService.getCurrentUser();
    
    try {
        await emailjs.send(config.serviceId, config.templateId, {
            to_name: toName,
            name: toName, // Suporte para {{name}}
            message: message,
            from_name: SYSTEM_NAME,
            reply_to: SYSTEM_EMAIL,
            to_email: SYSTEM_EMAIL, // Notificações vão para o sistema
            email: SYSTEM_EMAIL,
            password: 'N/A' 
        }, config.publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  },

  sendWelcomeEmail: async (toName: string, toEmail: string, tempPass: string): Promise<EmailResult> => {
    const config = storageService.getEmailConfig();
    
    if (!config) return { success: false, message: "Configuração de Email inexistente." };
    if (!toEmail) return { success: false, message: "Email de destino vazio." };

    const cleanEmail = toEmail.trim();

    const messageBody = `
      Bem-vindo à EduTech PT!
      
      A sua conta foi criada com sucesso.
      
      As suas credenciais de acesso são:
      Email: ${cleanEmail}
      Senha Temporária: ${tempPass}
      
      Por favor, aceda à plataforma e altere a sua senha no primeiro login.
    `;

    const templateParams = {
        to_name: toName,
        name: toName, // Suporte para {{name}} conforme solicitado
        
        // Variáveis de destino
        to_email: cleanEmail, 
        user_email: cleanEmail, 
        email: cleanEmail,
        recipient: cleanEmail,
        to: cleanEmail,
        
        // Conteúdo
        message: messageBody,
        password: tempPass,
        
        // Remetente (Fixo no sistema para garantir consistência)
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

  sendPasswordReset: async (toName: string, toEmail: string, newPass: string): Promise<EmailResult> => {
    const config = storageService.getEmailConfig();
    if (!config) return { success: false, message: "Configuração de Email inexistente." };

    if (!toEmail) return { success: false, message: "Email de destino vazio." };
    const cleanEmail = toEmail.trim();
    
    const messageBody = `
      Olá ${toName},

      A sua senha de acesso à plataforma EduTech PT foi redefinida.

      Novas credenciais:
      Email: ${cleanEmail}
      Nova Senha: ${newPass}
    `;

    const templateParams = {
        to_name: toName,
        name: toName, // Suporte para {{name}}
        to_email: cleanEmail, 
        user_email: cleanEmail, 
        email: cleanEmail,
        recipient: cleanEmail,
        to: cleanEmail,
        message: messageBody,
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
