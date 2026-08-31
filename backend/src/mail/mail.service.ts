import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { env } from '../config/env';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private client: Resend | null = null;

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const client = this.getClient();
    if (!client) {
      this.logger.warn(
        `RESEND_API_KEY não configurada — link de redefinição de senha para ${to}: ${resetUrl}`,
      );
      return;
    }
    await client.emails.send({
      from: env.RESEND_FROM_EMAIL,
      to,
      subject: 'Redefinição de senha — TastyBoard',
      html: `<p>Recebemos um pedido para redefinir sua senha no TastyBoard.</p><p><a href="${resetUrl}">Clique aqui para criar uma nova senha</a>.</p><p>Este link expira em 1 hora. Se você não pediu isso, pode ignorar este e-mail.</p>`,
    });
  }

  private getClient() {
    if (!env.RESEND_API_KEY) return null;
    if (!this.client) this.client = new Resend(env.RESEND_API_KEY);
    return this.client;
  }
}
