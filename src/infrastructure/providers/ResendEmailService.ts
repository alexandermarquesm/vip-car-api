import { Resend } from "resend";
import { IEmailService } from "../../application/protocols/IEmailService";

export class ResendEmailService implements IEmailService {
  private resend: Resend | null = null;
  private readonly isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  private readonly from = process.env.EMAIL_FROM || "VIP CAR <onboarding@resend.dev>";

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey !== "sua_chave_aqui") {
      this.resend = new Resend(apiKey);
    } else {
      console.log("\n\x1b[33m⚠️ [AVISO] RESEND_API_KEY não configurada ou inválida no arquivo .env!\x1b[0m");
      console.log("Os e-mails de confirmação serão impressos abaixo no console em desenvolvimento.\n");
    }
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from: this.from,
          to: [email],
          subject: "VIP CAR - Confirme seu E-mail",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #1A7BC2; margin-bottom: 12px; font-size: 22px; font-weight: 800;">Ative sua conta no VIP CAR!</h2>
              <p style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
                Olá! Utilize o código de verificação abaixo para confirmar seu e-mail e acessar o sistema:
              </p>
              <div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #0F172A;">${code}</span>
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 18px;">
                Este código expira em 15 minutos. Se você não fez essa solicitação, por favor desconsidere este e-mail.
              </p>
            </div>
          `,
        });

        if (!error) return;
        throw new Error(`Falha ao enviar e-mail de confirmação: ${error.message}`);
      } catch (err: any) {
        if (this.isProduction) throw err;
        console.error(`\x1b[31mFalha ao conectar à API do Resend:\x1b[0m ${err.message}`);
      }
    }

    if (this.isProduction) {
      throw new Error("Serviço de e-mail não configurado em produção.");
    }

    // Elegant fallback: print to console so the app never breaks for developers!
    console.log("\n========================================================");
    console.log("📧 [FALLBACK DE E-MAIL] CÓDIGO DE VERIFICAÇÃO GERADO!");
    console.log(`Para: \x1b[36m${email}\x1b[0m`);
    console.log("--------------------------------------------------------");
    console.log(`🔑 Seu código de ativação é: \x1b[1m\x1b[33m${code}\x1b[0m`);
    console.log("Expira em: 15 minutos.");
    console.log("========================================================\n");
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    if (this.resend) {
      try {
        const { error } = await this.resend.emails.send({
          from: this.from,
          to: [email],
          subject: "VIP CAR - Recuperação de Senha",
          html: `
            <div style="font-family: sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <h2 style="color: #1A7BC2; margin-bottom: 12px; font-size: 22px; font-weight: 800;">Recupere sua conta no VIP CAR!</h2>
              <p style="color: #475569; font-size: 16px; line-height: 24px; margin-bottom: 24px;">
                Olá! Utilize o código de verificação abaixo para redefinir sua senha de acesso:
              </p>
              <div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #0F172A;">${code}</span>
              </div>
              <p style="color: #94a3b8; font-size: 12px; line-height: 18px;">
                Este código expira em 15 minutos. Se você não fez essa solicitação, por favor desconsidere este e-mail.
              </p>
            </div>
          `,
        });

        if (!error) return;
        throw new Error(`Falha ao enviar e-mail de recuperação: ${error.message}`);
      } catch (err: any) {
        if (this.isProduction) throw err;
        console.error(`\x1b[31mFalha ao conectar à API do Resend:\x1b[0m ${err.message}`);
      }
    }

    if (this.isProduction) {
      throw new Error("Serviço de e-mail não configurado em produção.");
    }

    // Fallback console print
    console.log("\n========================================================");
    console.log("📧 [FALLBACK DE E-MAIL] RECUPERAÇÃO DE SENHA SOLICITADA!");
    console.log(`Para: \x1b[36m${email}\x1b[0m`);
    console.log("--------------------------------------------------------");
    console.log(`🔑 Seu código de redefinição é: \x1b[1m\x1b[33m${code}\x1b[0m`);
    console.log("Expira em: 15 minutos.");
    console.log("========================================================\n");
  }
}
