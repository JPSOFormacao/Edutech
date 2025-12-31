import emailjs from '@emailjs/browser';
import { storageService } from './storageService';

export const emailService = {
  sendTestEmail: async (): Promise<boolean> => {
    const config = storageService.getEmailConfig();
    if (!config) {
      throw new Error("Configuração de Email não encontrada. Por favor configure o Service ID, Template ID e Public Key.");
    }

    const currentUser = storageService.getCurrentUser();
    const userEmail = currentUser?.email || 'sistema@edutech.pt';
    const userName = currentUser?.name || 'Sistema EduTech';

    try {
      // Enviamos params redundantes para garantir compatibilidade com diferentes templates
      const templateParams = {
        to_name: "Administrador", 
        message: "Este é um email de teste da plataforma EduTech PT. Se está a ler isto, a configuração está correta.",
        from_name: userName,
        reply_to: userEmail,
        // Variantes para o destinatário
        user_email: userEmail,
        to_email: userEmail,
        email: userEmail,
        recipient: userEmail,
        to: userEmail
      };

      await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
      return true;
    } catch (error) {
      console.error("EmailJS Error:", error);
      throw error;
    }
  },

  sendNotification: async (toName: string, message: string): Promise<boolean> => {
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
            user_email: replyTo,
            email: replyTo,
            to: replyTo
        }, config.publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  },

  sendWelcomeEmail: async (toName: string, toEmail: string, tempPass: string): Promise<boolean> => {
    const config = storageService.getEmailConfig();
    if (!config) {
        console.error("Email Config missing");
        return false;
    }

    if (!toEmail) {
        console.error("Tentativa de envio de email sem destinatário.");
        return false;
    }

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
        // Variáveis de destino (Redundância para evitar erro "recipients address is empty")
        to_email: cleanEmail, 
        user_email: cleanEmail, 
        email: cleanEmail,
        recipient: cleanEmail,
        to: cleanEmail,
        
        // Conteúdo
        message: messageBody,
        password: tempPass,
        
        // Remetente
        from_name: "EduTech PT Admin",
        reply_to: adminEmail
    };

    try {
        console.log("A enviar email de boas-vindas para:", cleanEmail);
        await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
        return true;
    } catch (e) {
        console.error("Erro ao enviar welcome email:", e);
        return false;
    }
  },

  sendPasswordReset: async (toName: string, toEmail: string, newPass: string): Promise<boolean> => {
    const config = storageService.getEmailConfig();
    if (!config) return false;

    if (!toEmail) return false;
    const cleanEmail = toEmail.trim();
    
    const currentUser = storageService.getCurrentUser();
    const adminEmail = currentUser?.email || 'admin@edutech.pt';

    const messageBody = `
      Olá ${toName},

      A sua senha de acesso à plataforma EduTech PT foi redefinida pelo administrador.

      As suas novas credenciais:
      Email: ${cleanEmail}
      Nova Senha: ${newPass}

      Terá de alterar esta senha obrigatoriamente no próximo login.
    `;

    const templateParams = {
        to_name: toName,
        // Redundância de destinatário
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
        console.log("A enviar email de reset de senha para:", cleanEmail);
        await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
        return true;
    } catch (e) {
        console.error("Erro ao enviar reset email:", e);
        return false;
    }
  }
};