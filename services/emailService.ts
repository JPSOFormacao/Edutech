import emailjs from '@emailjs/browser';
import { storageService } from './storageService';

export const emailService = {
  sendTestEmail: async (): Promise<boolean> => {
    const config = storageService.getEmailConfig();
    if (!config) {
      throw new Error("Configuração de Email não encontrada. Por favor configure o Service ID, Template ID e Public Key.");
    }

    // Obter o utilizador atual para definir como remetente lógico (para o corpo do email e reply-to)
    const currentUser = storageService.getCurrentUser();
    const userEmail = currentUser?.email || 'sistema@edutech.pt';
    const userName = currentUser?.name || 'Sistema EduTech';

    try {
      const templateParams = {
        // 'to_name': Quem recebe (geralmente o Admin da plataforma)
        to_name: "Administrador", 
        
        // 'message': O conteúdo
        message: "Este é um email de teste da plataforma EduTech PT. Se está a ler isto, a configuração está correta.",
        
        // 'from_name': Nome de quem enviou (pode ser o nome do user logado)
        from_name: userName,

        // 'reply_to': IMPORTANTE - Quando o admin clicar em responder, vai para este email.
        // NÃO use isto no campo 'From Email' do template do EmailJS se usar Outlook/Gmail.
        reply_to: userEmail,
        
        // Variáveis extra que podem ser usadas no corpo do email
        user_email: userEmail
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

    try {
        await emailjs.send(config.serviceId, config.templateId, {
            to_name: toName,
            message: message,
            from_name: currentUser?.name || 'Sistema',
            reply_to: currentUser?.email || 'noreply@edutech.pt'
        }, config.publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  }
};