import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_FROM = process.env.EMAIL_FROM || 'max@rollingsudsnyct.net';

interface Attachment {
  name: string;
  contentType: string;
  base64: string;
}

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  attachments: Attachment[];
}

/**
 * Send an email via Resend
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { error } = await resend.emails.send({
    from: `Max Gelfman <${EMAIL_FROM}>`,
    replyTo: 'max.gelfman@rollingsuds.com',
    to: [options.to],
    cc: ['max.gelfman@rollingsuds.com'],
    subject: options.subject,
    html: options.body,
    attachments: options.attachments.map((att) => ({
      filename: att.name,
      content: Buffer.from(att.base64, 'base64'),
    })),
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

/**
 * Check if Resend is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
