import emailjs from '@emailjs/browser';
import { storageService } from './storageService';
import { EmailTemplates, FileDeletionLog } from '../types';

interface EmailResult {
    success: boolean;
    message?: string;
}

// Email oficial do sistema
const SYSTEM_EMAIL = 'EduTechPT@hotmail.com';
const SYSTEM_NAME = 'EduTech PT Formação';

// Helper para substituir variáveis no template personalizado
const processTemplate = (template: string, variables: Record<string, string>): string => {
    let processed = template;
    for (const [key, value] of Object.entries(variables)) {
        // Substitui {{variavel}} com duas chavetas
        const regex = new RegExp(`{{${key}}}`, 'g');
        processed = processed.replace(regex, value);
    }
    return processed;
};

// Helper para gerar o texto de detalhes da formação
const getTrainingDetailsString = async (classId?: string, courseIds?: string[]): Promise<string> => {
    try {
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

        if (!hasInfo) {
            return "A turma e/ou o curso será atribuída posteriormente pelo Formador";
        }

        return detailsParts.join('\n');
    } catch (e) {
        console.warn("Erro ao obter detalhes de formação para email:", e);
        return "Detalhes de formação indisponíveis.";
    }
};

const getErrorMsg = async (originalError: any): Promise<string> => {
    const config = await storageService.getEmailConfig();
    const techError = originalError?.text || originalError?.message || 'Erro desconhecido';
    
    if (config?.customErrorMessage) {
        return `${config.customErrorMessage} [Detalhe Técnico: ${techError}]`;
    }
    return techError;
};

// --- Helper to get Active Config containing a specific template ---
const getConfigForTemplate = async (templateKey: keyof EmailTemplates) => {
    const config = await storageService.getEmailConfig();
    if (!config) return null;

    // Procurar nas contas ATIVAS uma que tenha o template definido
    const profiles = config.profiles || [];
    
    // Filtra apenas contas ativas e que tenham o Service ID e Public Key definidos
    const activeProfiles = profiles.filter(p => p.isActive && p.serviceId && p.publicKey);

    // Tenta encontrar o primeiro perfil que tenha o Template ID solicitado
    let matchedProfile = activeProfiles.find(p => p.templates[templateKey] && p.templates[templateKey].trim().length > 0);

    // Se não encontrar, e for um pedido de template que pode ter fallback (ex: Notification), tenta o fallback
    if (!matchedProfile && templateKey === 'notificationId') {
         // Tenta encontrar qualquer perfil ativo que tenha ALGUM template genérico
         matchedProfile = activeProfiles.find(p => p.templates.notificationId || p.templates.welcomeId);
    }

    if (!matchedProfile) {
        return null;
    }

    return {
        serviceId: matchedProfile.serviceId,
        publicKey: matchedProfile.publicKey,
        templateId: matchedProfile.templates[templateKey],
        customContent: config.customContent
    };
};

export const emailService = {
  // Teste Genérico
  sendTestEmail: async (): Promise<EmailResult> => {
    return emailService.sendSpecificTemplateTest('welcomeId');
  },

  // Teste Específico por Tipo de Template
  sendSpecificTemplateTest: async (templateKey: keyof EmailTemplates): Promise<EmailResult> => {
    const config = await getConfigForTemplate(templateKey);
    
    // Validações Básicas
    if (!config) return { success: false, message: "Nenhuma conta ativa encontrada com este template configurado." };
    
    const { serviceId, publicKey, templateId, customContent } = config;

    // Dados Fictícios para o Teste
    const commonParams = {
        to_name: "Administrador (Teste)",
        name: "Administrador (Teste)",
        to_email: SYSTEM_EMAIL, 
        user_email: SYSTEM_EMAIL,
        email: SYSTEM_EMAIL,
        from_name: SYSTEM_NAME,
        reply_to: SYSTEM_EMAIL
    };

    let specificParams = {};
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://edutech.pt';
    const mockLink = `${baseUrl}/#/verify-email?token=TESTE-TOKEN-123`;

    // Verificar se existe Custom Content para este teste
    let messageBody = "";
    
    switch (templateKey) {
        case 'auditLogId':
            const mockFileList = "1. Ficheiro A.pdf (Apagado por João)\n2. Ficheiro B.jpg (Apagado por Maria)";
            if (customContent?.auditLogText) {
                messageBody = processTemplate(customContent.auditLogText, {
                    name: commonParams.to_name,
                    file_list: mockFileList,
                    total_files: "2"
                });
            } else {
                messageBody = `Relatório de Teste:\n\n${mockFileList}`;
            }
            specificParams = {
                message: messageBody,
                file_list: mockFileList,
                total_files: "2"
            };
            break;
        case 'verificationId':
            if (customContent?.verificationText) {
                messageBody = processTemplate(customContent.verificationText, {
                    name: commonParams.to_name,
                    link: mockLink,
                    verification_link: mockLink
                });
            } else {
                messageBody = "Email de teste para Validação de Conta.";
            }
            specificParams = {
                message: messageBody,
                verification_link: mockLink,
                link: mockLink,
                url: mockLink
            };
            break;
        case 'resetPasswordId':
            if (customContent?.resetPasswordText) {
                messageBody = processTemplate(customContent.resetPasswordText, {
                    name: commonParams.to_name,
                    email: commonParams.to_email,
                    password: "nova-senha-teste-123",
                    training_details: "Cursos: Exemplo de Curso Python"
                });
            } else {
                messageBody = "Email de teste para Recuperação de Senha.";
            }
            specificParams = {
                message: messageBody,
                password: "nova-senha-teste-123",
                training_details: "Cursos: Exemplo de Curso Python"
            };
            break;
        case 'welcomeId':
        default:
             if (customContent?.welcomeText) {
                messageBody = processTemplate(customContent.welcomeText, {
                    name: commonParams.to_name,
                    email: commonParams.to_email,
                    password: "senha-inicial-teste",
                    training_details: "Turma: Demo\nCursos: Introdução à IA"
                });
            } else {
                messageBody = "Bem-vindo à EduTech PT! Conta criada com sucesso.";
            }
            specificParams = {
                message: messageBody,
                password: "senha-inicial-teste",
                training_details: "Turma: Demo\nCursos: Introdução à IA"
            };
            break;
    }

    const templateParams = { ...commonParams, ...specificParams };

    try {
      console.log(`[EmailTest] Envio para ${SYSTEM_EMAIL} | Service: ${serviceId} | Template: ${templateKey} (${templateId})`);
      await emailjs.send(serviceId, templateId, templateParams, publicKey);
      return { success: true };
    } catch (error: any) {
      console.error("EmailJS Error:", error);
      const msg = await getErrorMsg(error);
      return { success: false, message: msg };
    }
  },

  sendNotification: async (toName: string, message: string, toEmail: string = SYSTEM_EMAIL): Promise<boolean> => {
    const config = await getConfigForTemplate('notificationId');
    if (!config) return false;
    
    const { serviceId, publicKey, templateId } = config;
    
    try {
        await emailjs.send(serviceId, templateId, {
            to_name: toName,
            name: toName,
            message: message,
            training_details: "N/A",
            from_name: SYSTEM_NAME,
            reply_to: SYSTEM_EMAIL,
            to_email: toEmail, 
            email: toEmail,
            password: 'N/A' 
        }, publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  },

  sendDeletionBatchEmail: async (logs: FileDeletionLog[]): Promise<boolean> => {
      // Tentar obter config para auditLogId, se não existir, tenta notificationId
      let config = await getConfigForTemplate('auditLogId');
      if (!config) {
          config = await getConfigForTemplate('notificationId');
      }

      if (!config) {
          console.error("Erro: Nenhum Template ID configurado para Auditoria ou Notificações em contas ativas.");
          return false;
      }

      const { serviceId, publicKey, templateId, customContent } = config;

      // 2. Formatar lista
      const list = logs.map((log, idx) => 
          `${idx + 1}. ${log.fileName} (Apagado por: ${log.deletedByName} em ${new Date(log.deletedAt).toLocaleString()})`
      ).join('\n');

      const totalFiles = logs.length.toString();

      // 3. Preparar Mensagem (Se houver texto customizado)
      let messageBody = "";
      if (customContent?.auditLogText) {
          messageBody = processTemplate(customContent.auditLogText, {
              name: "Administrador",
              file_list: list,
              total_files: totalFiles
          });
      } else {
          // Fallback message se não houver texto configurado
          messageBody = `
Relatório de Auditoria - Eliminação de Ficheiros

O sistema detetou a eliminação de ${totalFiles} novos ficheiros. Segue a lista abaixo:

${list}
          `;
      }

      // 4. Parâmetros EmailJS
      const templateParams = {
          to_name: "Administrador",
          name: "Administrador",
          to_email: SYSTEM_EMAIL, 
          email: SYSTEM_EMAIL,
          from_name: SYSTEM_NAME,
          message: messageBody,
          file_list: list, // Variável direta se o template usar {{file_list}}
          total_files: totalFiles,
          reply_to: SYSTEM_EMAIL
      };

      try {
          await emailjs.send(serviceId, templateId, templateParams, publicKey);
          return true;
      } catch (e) {
          console.error("Falha ao enviar email de auditoria:", e);
          return false;
      }
  },

  sendVerificationEmail: async (toName: string, toEmail: string, verificationLink: string): Promise<EmailResult> => {
    let config = await getConfigForTemplate('verificationId');
    if (!config) {
        // Fallback: Try general notification template
        config = await getConfigForTemplate('notificationId');
    }
    
    if (!config) return { success: false, message: "Erro Config: Nenhum template de verificação ou notificação ativo." };
    
    const { serviceId, publicKey, templateId, customContent } = config;
    
    // Verificar se existe texto personalizado ou usar Default
    let messageBody = "";
    if (customContent?.verificationText) {
        messageBody = processTemplate(customContent.verificationText, {
            name: toName,
            link: verificationLink,
            verification_link: verificationLink
        });
    } else {
        messageBody = `
          Olá ${toName},
          
          Obrigado pelo seu registo na EduTech PT.
          Por favor confirme o seu endereço de email clicando no link abaixo:
          
          ${verificationLink}
          
          Após a verificação, a sua conta ficará pendente de aprovação.
        `;
    }

    try {
        await emailjs.send(serviceId, templateId, {
            to_name: toName,
            name: toName,
            to_email: toEmail,
            email: toEmail,
            message: messageBody, 
            from_name: SYSTEM_NAME,
            reply_to: SYSTEM_EMAIL,
            verification_link: verificationLink,
            link: verificationLink,
            url: verificationLink
        }, publicKey);
        return { success: true };
    } catch (e: any) {
        console.error("Erro Email Verificação:", e);
        const msg = await getErrorMsg(e);
        return { success: false, message: msg };
    }
  },

  sendWelcomeEmail: async (toName: string, toEmail: string, tempPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const config = await getConfigForTemplate('welcomeId');
    if (!config) return { success: false, message: "Template de Boas-vindas não configurado em nenhuma conta ativa." };

    const { serviceId, publicKey, templateId, customContent } = config;

    const cleanEmail = toEmail.trim();
    const trainingDetails = await getTrainingDetailsString(classId, courseIds);

    // Verificar se existe texto personalizado ou usar Default
    let messageBody = "";
    if (customContent?.welcomeText) {
        messageBody = processTemplate(customContent.welcomeText, {
            name: toName,
            email: cleanEmail,
            password: tempPass,
            training_details: trainingDetails
        });
    } else {
        messageBody = `
          Bem-vindo à EduTech PT!
          
          A sua conta foi criada com sucesso.
          
          ${trainingDetails}
          
          As suas credenciais de acesso são:
          Email: ${cleanEmail}
          Senha Temporária: ${tempPass}
          
          Por favor, aceda à plataforma e altere a sua senha no primeiro login.
        `;
    }

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
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
        return { success: true };
    } catch (e: any) {
        const msg = await getErrorMsg(e);
        return { success: false, message: msg };
    }
  },

  sendPasswordReset: async (toName: string, toEmail: string, newPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const config = await getConfigForTemplate('resetPasswordId');
    if (!config) return { success: false, message: "Template de Reset de Senha não configurado em nenhuma conta ativa." };

    const { serviceId, publicKey, templateId, customContent } = config;

    const cleanEmail = toEmail.trim();
    const trainingDetails = await getTrainingDetailsString(classId, courseIds);
    
    // Verificar se existe texto personalizado ou usar Default
    let messageBody = "";
    if (customContent?.resetPasswordText) {
        messageBody = processTemplate(customContent.resetPasswordText, {
            name: toName,
            email: cleanEmail,
            password: newPass,
            training_details: trainingDetails
        });
    } else {
        messageBody = `
          Olá ${toName},
          A sua senha foi redefinida.
          ${trainingDetails}
          Novas credenciais:
          Email: ${cleanEmail}
          Nova Senha: ${newPass}
        `;
    }

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
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
        return { success: true };
    } catch (e: any) {
        const msg = await getErrorMsg(e);
        return { success: false, message: msg };
    }
  }
};
