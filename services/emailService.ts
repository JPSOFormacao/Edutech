
import emailjs from '@emailjs/browser';
import { storageService } from './storageService';
import { EmailTemplates, FileDeletionLog, EMAIL_KEYS } from '../types';

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
        // IMPORTANT: Use arrow function for replacement value to avoid interpreting special characters like '$' in the password
        processed = processed.replace(regex, () => value);
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
const getConfigForTemplate = async (templateKey: keyof EmailTemplates): Promise<{config: any, error?: string} | null> => {
    const config = await storageService.getEmailConfig();
    if (!config) return { config: null, error: "Configurações de email não encontradas." };

    const profiles = config.profiles || [];
    
    // 1. Procurar SE existe o template em ALGUM perfil (para diagnóstico)
    const profileWithTemplate = profiles.find(p => p.templates[templateKey] && p.templates[templateKey].trim().length > 0);
    
    if (!profileWithTemplate) {
        return { config: null, error: `O ID do template '${templateKey}' não está preenchido em nenhuma conta.` };
    }

    // 2. Se existe, verificar se esse perfil está ATIVO e com CREDENCIAIS
    if (!profileWithTemplate.isActive) {
        return { config: null, error: `O template '${templateKey}' existe na conta, mas a conta está INATIVA ("Conta Ativa" desligado).` };
    }

    if (!profileWithTemplate.serviceId || !profileWithTemplate.publicKey) {
        return { config: null, error: `O template '${templateKey}' existe, mas a conta não tem Service ID ou Public Key configurados.` };
    }

    // Sucesso
    return {
        config: {
            serviceId: profileWithTemplate.serviceId,
            publicKey: profileWithTemplate.publicKey,
            templateId: profileWithTemplate.templates[templateKey],
            customContent: config.customContent
        }
    };
};

// --- Universal Fallback Helper ---
// Tenta obter a config para a chave pedida. Se falhar, tenta 'notificationId', depois 'welcomeId'.
// Isto permite que o sistema funcione com uma configuração mínima.
const getConfigWithFallback = async (primaryKey: keyof EmailTemplates): Promise<{config: any, error?: string}> => {
    // 1. Tentar a chave primária
    let result = await getConfigForTemplate(primaryKey);
    if (result && result.config) return result;

    console.warn(`Template '${primaryKey}' não configurado. A tentar fallback...`);

    // 2. Tentar Notification ID (Genérico)
    if (primaryKey !== EMAIL_KEYS.NOTIFICATION) {
        result = await getConfigForTemplate(EMAIL_KEYS.NOTIFICATION);
        if (result && result.config) return result;
    }

    // 3. Tentar Welcome ID (Mais comum de existir)
    if (primaryKey !== EMAIL_KEYS.WELCOME) {
        result = await getConfigForTemplate(EMAIL_KEYS.WELCOME);
        if (result && result.config) return result;
    }

    return { config: null, error: `Não foi possível encontrar nenhum template de email configurado (nem ${primaryKey}, nem Notificação, nem Boas-vindas). Configure pelo menos um em "Credenciais Email".` };
};

export const emailService = {
  // Teste Genérico
  sendTestEmail: async (): Promise<EmailResult> => {
    return emailService.sendSpecificTemplateTest(EMAIL_KEYS.WELCOME);
  },

  // Teste Específico por Tipo de Template
  sendSpecificTemplateTest: async (templateKey: keyof EmailTemplates): Promise<EmailResult> => {
    // Para testes explícitos, não usamos fallback automático para não enganar o utilizador
    // Queremos que ele saiba se AQUELE template específico está a falhar.
    const result = await getConfigForTemplate(templateKey);
    
    if (!result || !result.config) {
        return { success: false, message: result?.error || "Erro de configuração desconhecido." };
    }
    
    const { serviceId, publicKey, templateId, customContent } = result.config;
    const systemConfig = await storageService.getSystemConfig();
    const validityText = (systemConfig?.tempPasswordValidityHours || 48) + " horas";

    // Dados Fictícios para o Teste
    const commonParams = {
        to_name: "Administrador (Teste)",
        name: "Administrador (Teste)",
        to_email: SYSTEM_EMAIL, 
        user_email: SYSTEM_EMAIL,
        email: SYSTEM_EMAIL,
        from_name: SYSTEM_NAME,
        reply_to: SYSTEM_EMAIL,
        mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
    };

    let specificParams = {};
    // Safer base url construction
    const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://edutech.pt';
    const mockLink = `${baseUrl}#/verify-email?token=TESTE-TOKEN-123`;
    const mockRecoveryLink = `${baseUrl}#/reset-password?token=TESTE-TOKEN-123`;

    // Verificar se existe Custom Content para este teste
    let messageBody = "";
    
    switch (templateKey) {
        case EMAIL_KEYS.AUDIT_LOG:
            const mockFileList = "1. Ficheiro A.pdf (Apagado por João)\n2. Ficheiro B.jpg (Apagado por Maria)";
            if (customContent?.auditLogText) {
                messageBody = processTemplate(customContent.auditLogText, {
                    name: commonParams.to_name,
                    file_list: mockFileList,
                    total_files: "2",
                    site_link: baseUrl,
                    mailto_link: commonParams.mailto_link
                });
            } else {
                messageBody = `Relatório de Teste:\n\n${mockFileList}`;
            }
            specificParams = {
                message: messageBody,
                file_list: mockFileList,
                total_files: "2",
                site_link: baseUrl
            };
            break;
        case EMAIL_KEYS.VERIFICATION:
            if (customContent?.verificationText) {
                messageBody = processTemplate(customContent.verificationText, {
                    name: commonParams.to_name,
                    link: mockLink,
                    verification_link: mockLink,
                    site_link: baseUrl,
                    mailto_link: commonParams.mailto_link
                });
            } else {
                messageBody = "Email de teste para Validação de Conta.";
            }
            specificParams = {
                message: messageBody,
                verification_link: mockLink,
                link: mockLink,
                url: mockLink,
                site_link: baseUrl
            };
            break;
        case EMAIL_KEYS.RESET_PASSWORD:
            // Este é o Admin Reset (Nova Senha Gerada)
            if (customContent?.resetPasswordText) {
                messageBody = processTemplate(customContent.resetPasswordText, {
                    name: commonParams.to_name,
                    email: commonParams.to_email,
                    password: "nova-senha-teste-123",
                    training_details: "Cursos: Exemplo de Curso Python",
                    site_link: baseUrl,
                    password_validity: validityText,
                    mailto_link: commonParams.mailto_link
                });
            } else {
                messageBody = "Email de teste para Nova Senha (Reset por Admin).";
            }
            specificParams = {
                message: messageBody,
                password: "nova-senha-teste-123",
                training_details: "Cursos: Exemplo de Curso Python",
                site_link: baseUrl,
                password_validity: validityText
            };
            break;
        case EMAIL_KEYS.RECOVERY:
            // Este é o User Forgot Password (Link)
            if (customContent?.recoveryEmailText) {
                messageBody = processTemplate(customContent.recoveryEmailText, {
                    name: commonParams.to_name,
                    email: commonParams.to_email,
                    recovery_link: mockRecoveryLink,
                    site_link: baseUrl,
                    mailto_link: commonParams.mailto_link
                });
            } else {
                messageBody = "Email de teste para Recuperação de Acesso (Link).";
            }
            specificParams = {
                message: messageBody,
                recovery_link: mockRecoveryLink,
                link: mockRecoveryLink, // Generic alias
                site_link: baseUrl
            };
            break;
        case EMAIL_KEYS.ENROLLMENT:
            const mockCourse = "Curso Intensivo de Python";
            if (customContent?.enrollmentText) {
                messageBody = processTemplate(customContent.enrollmentText, {
                    name: commonParams.to_name,
                    course_name: mockCourse,
                    site_link: baseUrl,
                    mailto_link: commonParams.mailto_link
                });
            } else {
                messageBody = `A sua inscrição no curso ${mockCourse} foi confirmada.`;
            }
            specificParams = {
                message: messageBody,
                course_name: mockCourse,
                site_link: baseUrl
            };
            break;
        case EMAIL_KEYS.NOTIFICATION:
            const mockMsg = "Esta é uma notificação de teste do sistema.";
            if (customContent?.notificationText) {
                messageBody = processTemplate(customContent.notificationText, {
                    name: commonParams.to_name,
                    message: mockMsg,
                    site_link: baseUrl,
                    mailto_link: commonParams.mailto_link
                });
            } else {
                messageBody = mockMsg;
            }
            specificParams = {
                message: messageBody,
                site_link: baseUrl
            };
            break;
        case EMAIL_KEYS.WELCOME:
        default:
             if (customContent?.welcomeText) {
                messageBody = processTemplate(customContent.welcomeText, {
                    name: commonParams.to_name,
                    email: commonParams.to_email,
                    password: "senha-inicial-teste",
                    training_details: "Turma: Demo\nCursos: Introdução à IA",
                    site_link: baseUrl,
                    password_validity: validityText,
                    mailto_link: commonParams.mailto_link
                });
            } else {
                messageBody = "Bem-vindo à EduTech PT! Conta criada com sucesso.";
            }
            specificParams = {
                message: messageBody,
                password: "senha-inicial-teste",
                training_details: "Turma: Demo\nCursos: Introdução à IA",
                site_link: baseUrl,
                password_validity: validityText
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
    const result = await getConfigWithFallback(EMAIL_KEYS.NOTIFICATION);
    if (!result || !result.config) return false;
    
    const { serviceId, publicKey, templateId, customContent } = result.config;
    const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://edutech.pt';
    
    let messageBody = "";
    if (customContent?.notificationText) {
        messageBody = processTemplate(customContent.notificationText, {
            name: toName,
            message: message,
            site_link: baseUrl,
            mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
        });
    } else {
        messageBody = message;
    }

    try {
        await emailjs.send(serviceId, templateId, {
            to_name: toName,
            name: toName,
            message: messageBody,
            original_message: message,
            training_details: "N/A",
            from_name: SYSTEM_NAME,
            reply_to: SYSTEM_EMAIL,
            to_email: toEmail, 
            email: toEmail,
            password: 'N/A',
            site_link: baseUrl,
            mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
        }, publicKey);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
  },

  sendEnrollmentEmail: async (toName: string, toEmail: string, courseName: string): Promise<EmailResult> => {
      const result = await getConfigWithFallback(EMAIL_KEYS.ENROLLMENT);
      if (!result || !result.config) return { success: false, message: result?.error || "Configuração de email em falta." };

      const { serviceId, publicKey, templateId, customContent } = result.config;
      const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://edutech.pt';
      const cleanEmail = toEmail.trim();

      let messageBody = "";
      if (customContent?.enrollmentText) {
          messageBody = processTemplate(customContent.enrollmentText, {
              name: toName,
              course_name: courseName,
              site_link: baseUrl,
              mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
          });
      } else {
          messageBody = `
            Olá ${toName},
            
            A sua inscrição no curso "${courseName}" foi confirmada com sucesso!
            
            Pode aceder aos conteúdos na secção "Meus Cursos" da plataforma.
          `;
      }

      try {
          await emailjs.send(serviceId, templateId, {
              to_name: toName,
              name: toName,
              to_email: cleanEmail,
              email: cleanEmail,
              message: messageBody,
              course_name: courseName,
              site_link: baseUrl,
              from_name: SYSTEM_NAME,
              reply_to: SYSTEM_EMAIL
          }, publicKey);
          return { success: true };
      } catch (e: any) {
          const msg = await getErrorMsg(e);
          return { success: false, message: msg };
      }
  },

  sendDeletionBatchEmail: async (logs: FileDeletionLog[]): Promise<boolean> => {
      // Tentar auditLogId, fallback para notificationId
      let result = await getConfigWithFallback(EMAIL_KEYS.AUDIT_LOG);
      
      if (!result || !result.config) {
          console.error("Erro: Nenhum Template ID configurado para Auditoria ou Notificações.");
          return false;
      }

      const { serviceId, publicKey, templateId, customContent } = result.config;
      const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://edutech.pt';

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
              total_files: totalFiles,
              site_link: baseUrl,
              mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
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
          reply_to: SYSTEM_EMAIL,
          site_link: baseUrl,
          mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
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
    const result = await getConfigWithFallback(EMAIL_KEYS.VERIFICATION);
    
    if (!result || !result.config) return { success: false, message: result?.error || "Erro de configuração de email." };
    
    const { serviceId, publicKey, templateId, customContent } = result.config;
    const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://edutech.pt';
    
    // Verificar se existe texto personalizado ou usar Default
    let messageBody = "";
    if (customContent?.verificationText) {
        messageBody = processTemplate(customContent.verificationText, {
            name: toName,
            link: verificationLink,
            verification_link: verificationLink,
            site_link: baseUrl,
            mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
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
            url: verificationLink,
            site_link: baseUrl,
            mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
        }, publicKey);
        return { success: true };
    } catch (e: any) {
        console.error("Erro Email Verificação:", e);
        const msg = await getErrorMsg(e);
        return { success: false, message: msg };
    }
  },

  sendRecoveryEmail: async (toName: string, toEmail: string, recoveryLink: string): Promise<EmailResult> => {
      // Tentar recoveryId, fallback para notificationId ou welcomeId
      const result = await getConfigWithFallback(EMAIL_KEYS.RECOVERY);
      
      if (!result || !result.config) {
          return { success: false, message: result?.error || "Nenhum template disponível para envio de recuperação." };
      }

      const { serviceId, publicKey, templateId, customContent } = result.config;
      const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://edutech.pt';
      const cleanEmail = toEmail.trim();

      // Check if there is custom text for Recovery Link
      let messageBody = "";
      if (customContent?.recoveryEmailText) {
          messageBody = processTemplate(customContent.recoveryEmailText, {
              name: toName,
              email: cleanEmail,
              recovery_link: recoveryLink,
              site_link: baseUrl,
              mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
          });
      } else {
          messageBody = `
            Olá ${toName},
            
            Recebemos um pedido para redefinir a sua palavra-passe.
            Para continuar, clique no link abaixo (válido por 24 horas):
            
            ${recoveryLink}
            
            Se não solicitou esta alteração, ignore este email.
          `;
      }

      const templateParams = {
          to_name: toName,
          name: toName,
          to_email: cleanEmail,
          email: cleanEmail,
          recipient: cleanEmail,
          to: cleanEmail,
          
          // Content
          message: messageBody,
          recovery_link: recoveryLink,
          link: recoveryLink, // Generic alias just in case
          
          from_name: SYSTEM_NAME,
          reply_to: SYSTEM_EMAIL,
          site_link: baseUrl,
          mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
      };

      try {
          await emailjs.send(serviceId, templateId, templateParams, publicKey);
          return { success: true };
      } catch (e: any) {
          const msg = await getErrorMsg(e);
          return { success: false, message: msg };
      }
  },

  sendWelcomeEmail: async (toName: string, toEmail: string, tempPass: string, classId?: string, courseIds?: string[]): Promise<EmailResult> => {
    const result = await getConfigWithFallback(EMAIL_KEYS.WELCOME);
    if (!result || !result.config) return { success: false, message: result?.error || "Template de boas-vindas não configurado." };

    const { serviceId, publicKey, templateId, customContent } = result.config;
    const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://edutech.pt';
    
    const systemConfig = await storageService.getSystemConfig();
    const validityText = (systemConfig?.tempPasswordValidityHours || 48) + " horas";

    const cleanEmail = toEmail.trim();
    const trainingDetails = await getTrainingDetailsString(classId, courseIds);

    // Verificar se existe texto personalizado ou usar Default
    let messageBody = "";
    if (customContent?.welcomeText) {
        messageBody = processTemplate(customContent.welcomeText, {
            name: toName,
            email: cleanEmail,
            password: tempPass,
            training_details: trainingDetails,
            site_link: baseUrl,
            password_validity: validityText,
            mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
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
        reply_to: SYSTEM_EMAIL,
        site_link: baseUrl,
        password_validity: validityText,
        mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
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
    // This sends the NEW password (Admin Reset), not the link
    const result = await getConfigWithFallback(EMAIL_KEYS.RESET_PASSWORD);
    if (!result || !result.config) return { success: false, message: result?.error || "Template de Reset não configurado." };

    const { serviceId, publicKey, templateId, customContent } = result.config;
    const baseUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://edutech.pt';
    
    const systemConfig = await storageService.getSystemConfig();
    const validityText = (systemConfig?.tempPasswordValidityHours || 48) + " horas";

    const cleanEmail = toEmail.trim();
    const trainingDetails = await getTrainingDetailsString(classId, courseIds);
    
    // Verificar se existe texto personalizado ou usar Default
    let messageBody = "";
    if (customContent?.resetPasswordText) {
        messageBody = processTemplate(customContent.resetPasswordText, {
            name: toName,
            email: cleanEmail,
            password: newPass,
            training_details: trainingDetails,
            site_link: baseUrl,
            password_validity: validityText,
            mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
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
        reply_to: SYSTEM_EMAIL,
        site_link: baseUrl,
        password_validity: validityText,
        mailto_link: `<a href="mailto:${SYSTEM_EMAIL}">${SYSTEM_EMAIL}</a>`
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
