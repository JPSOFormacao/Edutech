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
        to_name: "Administrador", 
        message: "Este é um email de teste da plataforma EduTech PT. Se está a ler isto, a configuração está correta.",
        from_name: userName,
        reply_to: userEmail,
        user_email: userEmail,
        to_email: userEmail, // Standard
        email: userEmail, // Fallback comum
        recipient: userEmail // Outro fallback comum
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
            // Garantir que variaveis de email estão presentes se o template as usar
            user_email: replyTo,
            email: replyTo
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

    const currentUser = storageService.getCurrentUser();
    const adminEmail = currentUser?.email || 'admin@edutech.pt';

    const messageBody = `
      Bem-vindo à EduTech PT!
      
      A sua conta foi criada com sucesso.
      
      As suas credenciais de acesso são:
      Email: ${toEmail}
      Senha Temporária: ${tempPass}
      
      Por favor, aceda à plataforma e altere a sua senha no primeiro login.
    `;

    // Enviamos múltiplas variações para garantir que o template do EmailJS encontra o destinatário
    const templateParams = {
        to_name: toName,
        
        // Variáveis de destino (Redundância para evitar erro "recipients address is empty")
        to_email: toEmail, 
        user_email: toEmail, 
        email: toEmail,
        recipient: toEmail,
        
        // Conteúdo
        message: messageBody,
        password: tempPass, // Variável explícita para usar {{password}} no template
        
        // Remetente
        from_name: "EduTech PT Admin",
        reply_to: adminEmail
    };

    try {
        console.log("A enviar email para:", toEmail, "com Params:", templateParams);
        await emailjs.send(config.serviceId, config.templateId, templateParams, config.publicKey);
        console.log("Email enviado com sucesso pelo SDK.");
        return true;
    } catch (e) {
        console.error("Erro ao enviar welcome email:", e);
        return false;
    }
  }
};