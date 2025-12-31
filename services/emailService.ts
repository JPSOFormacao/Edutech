import emailjs from '@emailjs/browser';
import { storageService } from './storageService';

export const emailService = {
  sendTestEmail: async (): Promise<boolean> => {
    const config = storageService.getEmailConfig();
    if (!config) {
      throw new Error("Configuração de Email não encontrada. Por favor configure o Service ID, Template ID e Public Key.");
    }

    try {
      // Simple test parameters. Ensure your template accepts 'to_name' and 'message'
      const templateParams = {
        to_name: "Administrador",
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

    try {
        await emailjs.send(config.serviceId, config.templateId, {
            to_name: toName,
            message: message
        }, config.publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  }
};