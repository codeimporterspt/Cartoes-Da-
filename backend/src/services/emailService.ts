import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'Cartões Dá <noreply@hyundai.pt>';
const FINANCE_EMAIL = process.env.FINANCE_EMAIL || 'finance@hyundai.pt';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

async function sendEmail(to: string | string[], subject: string, html: string) {
  await transporter.sendMail({ from: FROM, to, subject, html });
}

export const emailService = {
  async accountApproved(userEmail: string, userName: string) {
    const loginUrl = `${FRONTEND_URL}/login`;
    await sendEmail(
      userEmail,
      '[Cartões Dá] Acesso aprovado',
      `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1f2937">
        <h2 style="margin:0 0 16px;font-size:20px;color:#111827">O seu acesso foi aprovado</h2>
        <p style="margin:0 0 12px">Olá <strong>${userName}</strong>,</p>
        <p style="margin:0 0 24px">A sua conta na plataforma <strong>Cartões Dá</strong> foi aprovada por um administrador. Já pode iniciar sessão e aceder às marcas que lhe foram atribuídas.</p>
        <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:#1e3a8a;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Aceder à plataforma</a>
        <p style="margin:32px 0 0;font-size:12px;color:#9ca3af">Se o botão não funcionar, copie e cole este endereço no seu browser:<br>${loginUrl}</p>
      </div>`
    );
  },

  async cardDeclarationSubmitted(userName: string, cardNumber: string) {
    await sendEmail(
      FINANCE_EMAIL,
      '[Cartões Dá] Nova Declaração de Cartão Pendente',
      `<h2>Nova Declaração de Cartão</h2>
       <p>O colaborador <strong>${userName}</strong> submeteu uma nova declaração para o cartão <strong>${cardNumber}</strong>.</p>
       <p>Por favor, aceda ao backoffice para validar a declaração.</p>`
    );
  },

  async cardApproved(userEmail: string, userName: string, cardNumber: string) {
    await sendEmail(
      userEmail,
      '[Cartões Dá] Cartão Aprovado',
      `<h2>O seu Cartão foi Aprovado</h2>
       <p>Olá ${userName},</p>
       <p>A sua declaração para o cartão <strong>${cardNumber}</strong> foi aprovada.</p>
       <p>O cartão está agora ativo e pode receber prémios.</p>`
    );
  },

  async cardRejected(userEmail: string, userName: string, cardNumber: string, reason: string) {
    await sendEmail(
      userEmail,
      '[Cartões Dá] Cartão Rejeitado',
      `<h2>O seu Cartão foi Rejeitado</h2>
       <p>Olá ${userName},</p>
       <p>A sua declaração para o cartão <strong>${cardNumber}</strong> foi rejeitada.</p>
       <p><strong>Motivo:</strong> ${reason}</p>
       <p>Por favor, submeta uma nova declaração corrigida.</p>`
    );
  },

  async prizeImportSuccess(userEmail: string, userName: string, count: number) {
    await sendEmail(
      userEmail,
      '[Cartões Dá] Importação de Prémios Concluída',
      `<h2>Importação Concluída com Sucesso</h2>
       <p>Olá ${userName},</p>
       <p>A importação foi processada com sucesso: <strong>${count} prémios</strong> importados.</p>`
    );
  },

  async prizeImportError(userEmail: string, userName: string, errors: string[]) {
    await sendEmail(
      userEmail,
      '[Cartões Dá] Erro na Importação de Prémios',
      `<h2>Erros na Importação</h2>
       <p>Olá ${userName},</p>
       <p>Foram detetados os seguintes erros no ficheiro importado:</p>
       <ul>${errors.map(e => `<li>${e}</li>`).join('')}</ul>
       <p>Por favor, corrija os erros e tente novamente.</p>`
    );
  },

  async prizeValidationApproved(stakeholderEmails: string[], count: number, totalValue: number) {
    await sendEmail(
      stakeholderEmails,
      '[Cartões Dá] Prémios Aprovados',
      `<h2>Prémios Validados</h2>
       <p><strong>${count} prémios</strong> foram aprovados com um valor total de <strong>${totalValue.toFixed(2)}€</strong>.</p>`
    );
  },

  async prizeValidationRejected(importerEmail: string, importerName: string, reason: string) {
    await sendEmail(
      importerEmail,
      '[Cartões Dá] Prémios Rejeitados',
      `<h2>Prémios Rejeitados</h2>
       <p>Olá ${importerName},</p>
       <p>Os prémios foram rejeitados.</p>
       <p><strong>Motivo:</strong> ${reason}</p>`
    );
  },

  async cardBalanceUpdated(userEmail: string, userName: string, cardNumber: string, amount: number, newBalance: number) {
    await sendEmail(
      userEmail,
      '[Cartões Dá] Saldo do Cartão Atualizado',
      `<h2>Saldo Atualizado</h2>
       <p>Olá ${userName},</p>
       <p>O saldo do seu cartão <strong>${cardNumber}</strong> foi atualizado.</p>
       <p>Valor carregado: <strong>${amount.toFixed(2)}€</strong></p>
       <p>Novo saldo: <strong>${newBalance.toFixed(2)}€</strong></p>`
    );
  },

  async monthlyReminder(activeCardHolders: { email: string; name: string }[]) {
    for (const holder of activeCardHolders) {
      await sendEmail(
        holder.email,
        '[Cartões Dá] Lembrete Mensal — Cartão Dá',
        `<h2>Lembrete Mensal</h2>
         <p>Olá ${holder.name},</p>
         <p>Este é o seu lembrete mensal para verificar e atualizar o saldo do seu Cartão Dá.</p>
         <p>Caso ainda não tenha um cartão registado, aproveite para criar um novo através da plataforma.</p>
         <p>Aceda à plataforma para mais informações.</p>`
      );
    }
  },
};
