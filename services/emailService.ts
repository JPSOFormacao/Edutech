import emailjs from '@emailjs/browser';
import { storageService } from './storageService';

interface EmailResult {
    success: boolean;
    message?: string;
}

export const emailService = {
  sendTestEmail: async (): Promise<EmailResult> => {
    const config = storageService.getEmailConfig();
    if (!config || !config.serviceId || !config.templateId || !config.publicKey) {
      throw new Error("Configuração incompleta. Verifique Service ID, Template ID e Public Key.");
    }

    const currentUser = storageService.getCurrentUser();
    const userEmail = currentUser?.email || 'sistema@edutech.pt';
    const userName = currentUser?.name || 'Sistema EduTech';

    try {
      const templateParams = {
        to_name: "Administrador", 
        message: "Email de teste EduTech PT.",
        from_name: userName,
        reply_to: userEmail,
        user_email: userEmail,
        to_email: userEmail,
        email: userEmail,
        recipient: userEmail,
        to: userEmail
      };

      await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
      return { success: true };
    } catch (error: any) {
      console.error("EmailJS Error:", error);
      return { success: false, message: error?.text || error?.message || 'Erro desconhecido' };
    }
  },

  sendNotification: async (toName: string, message: string): Promise<boolean> => {
    // Mantido simples para compatibilidade, mas idealmente deve ser migrado
    const config = storageService.getEmailConfig();
    if (!config) return false;

    const currentUser = storageService.getCurrentUser();
    const replyTo = currentUser?.email || 'noreply@edutech.pt';

    try {
        await emailjs.send(config.serviceId, config.templateId, {
            to_name: toName,
            message: message,
            from_name: currentUser?.name || 'Sistema',
            reply_to: replyTo,
            to_email: replyTo,
            email: replyTo
        }, config.publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  },

  sendWelcomeEmail: async (toName: string, toEmail: string, tempPass: string): Promise<EmailResult> => {
    const config = storageService.getEmailConfig();
    
    // Validação detalhada
    if (!config) return { success: false, message: "Configuração de Email inexistente." };
    if (!config.serviceId) return { success: false, message: "Service ID em falta na configuração." };
    if (!config.templateId) return { success: false, message: "Template ID em falta na configuração." };
    if (!config.publicKey) return { success: false, message: "Public Key em falta na configuração." };

    if (!toEmail) return { success: false, message: "Email de destino vazio." };

    const cleanEmail = toEmail.trim();
    const currentUser = storageService.getCurrentUser();
    const adminEmail = currentUser?.email || 'admin@edutech.pt';

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
        to_email: cleanEmail, 
        user_email: cleanEmail, 
        email: cleanEmail,
        recipient: cleanEmail,
        to: cleanEmail,
        message: messageBody,
        password: tempPass,
        from_name: "EduTech PT Admin",
        reply_to: adminEmail
    };

    try {
        console.log("Tentando enviar via EmailJS:", config.serviceId, config.templateId);
        await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
        return { success: true };
    } catch (e: any) {
        console.error("Erro Fatal EmailJS:", e);
        // Tentar extrair a mensagem de erro real do objeto EmailJS
        const errorMsg = e?.text || e?.message || JSON.stringify(e);
        return { success: false, message: errorMsg };
    }
  },

  sendPasswordReset: async (toName: string, toEmail: string, newPass: string): Promise<EmailResult> => {
    const config = storageService.getEmailConfig();
    if (!config) return { success: false, message: "Configuração de Email inexistente." };

    if (!toEmail) return { success: false, message: "Email de destino vazio." };
    const cleanEmail = toEmail.trim();
    
    const currentUser = storageService.getCurrentUser();
    const adminEmail = currentUser?.email || 'admin@edutech.pt';

    const messageBody = `
      Olá ${toName},

      A sua senha de acesso à plataforma EduTech PT foi redefinida.

      Novas credenciais:
      Email: ${cleanEmail}
      Nova Senha: ${newPass}
    `;

    const templateParams = {
        to_name: toName,
        to_email: cleanEmail, 
        user_email: cleanEmail, 
        email: cleanEmail,
        recipient: cleanEmail,
        to: cleanEmail,
        message: messageBody,
        password: newPass,
        from_name: "EduTech PT Admin",
        reply_to: adminEmail
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