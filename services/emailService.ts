import emailjs from '@emailjs/browser';
import { storageService } from './storageService';

export const emailService = {
  sendTestEmail: async (): Promise<boolean> => {
    const config = storageService.getEmailConfig();
    if (!config) {
      throw new Error("Configuração de Email não encontrada.");
    }

    try {
      // Initialize with public key
      emailjs.init(config.publicKey);

      // Simple test parameters. Ensure your template accepts 'to_name' and 'message' or similar
      const templateParams = {
        to_name: "Administrador",
        message: "Este é um email de teste da plataforma EduTech PT.",
        reply_to: "noreply@edutech.pt"
      };

      await emailjs.send(config.serviceId, config.templateId, templateParams);
      return true;
    } catch (error) {
      console.error("EmailJS Error:", error);
      throw error;
    }
  },

  // Example method for future use (e.g., student registration)
  sendNotification: async (toName: string, message: string): Promise<boolean> => {
    const config = storageService.getEmailConfig();
    if (!config) return false;

    try {
        emailjs.init(config.publicKey);
        await emailjs.send(config.serviceId, config.templateId, {
            to_name: toName,
            message: message
        });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  }
};