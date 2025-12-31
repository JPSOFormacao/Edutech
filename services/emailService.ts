import emailjs from '@emailjs/browser';
import { storageService } from './storageService';

export const emailService = {
  sendTestEmail: async (): Promise<boolean> => {
    const config = storageService.getEmailConfig();
    if (!config) {
      throw new Error("Configuração de Email não encontrada. Por favor configure o Service ID, Template ID e Public Key.");
    }

    // Obter o utilizador atual para definir como destinatário do teste
    const currentUser = storageService.getCurrentUser();
    const recipientEmail = currentUser?.email || 'admin@edutech.pt';

    try {
      // Adicionados campos comuns (to_email, user_email) que os templates EmailJS costumam exigir
      // para preencher o campo "To" (Para) dinamicamente.
      const templateParams = {
        to_name: currentUser?.name || "Administrador",
        to_email: recipientEmail,
        user_email: recipientEmail,
        email: recipientEmail,
        message: "Este é um email de teste da plataforma EduTech PT. Se está a ler isto, a configuração está correta.",
        reply_to: "noreply@edutech.pt"
      };

      // Using the 4th argument for publicKey avoids need for global init()
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

    // Fallback simples para o email, caso necessário
    const currentUser = storageService.getCurrentUser();

    try {
        await emailjs.send(config.serviceId, config.templateId, {
            to_name: toName,
            to_email: currentUser?.email,
            message: message
        }, config.publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  }
};