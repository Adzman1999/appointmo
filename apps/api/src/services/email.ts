import { Resend } from 'resend';
import { config } from '../config';

export interface SendPasscodeOptions {
  recipientEmail: string;
  recipientName: string;
  passcode: string;
  expiresInMinutes: number;
}

export interface EmailServiceResult {
  success: boolean;
  messageId?: string;
  isMock: boolean;
  error?: string;
}

export class EmailService {
  private static resendClient: Resend | null = config.resendApiKey ? new Resend(config.resendApiKey) : null;

  static async sendAccessPasscode(options: SendPasscodeOptions): Promise<EmailServiceResult> {
    const { recipientEmail, recipientName, passcode, expiresInMinutes } = options;

    const subject = 'Your Appointmo Access Is Ready';
    const textBody = `Hi ${recipientName},

Your request to explore Appointmo has been approved.

Use the access code below to continue:

${passcode}

This code expires in ${expiresInMinutes} minutes and can only be used once.

If you didn't request access, you can safely ignore this email.

We're excited to show you a smarter way to manage appointments.

— The Appointmo Team`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1c1917; line-height: 1.6;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 20px; font-weight: 700; color: #1c1917; letter-spacing: -0.5px;">Appointmo</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #1c1917;">Your access is ready</h2>
        <p style="font-size: 15px; color: #44403c; margin-bottom: 24px;">
          Hi ${recipientName},<br><br>
          Your request to explore Appointmo has been approved. Enter this access code to continue into the interactive experience:
        </p>
        <div style="background-color: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1c1917; display: block;">
            ${passcode}
          </span>
          <span style="font-size: 12px; color: #78716c; margin-top: 8px; display: block;">
            Expires in ${expiresInMinutes} minutes • Single-use code
          </span>
        </div>
        <p style="font-size: 13px; color: #78716c; margin-top: 24px;">
          If you didn't request access, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #a8a29e;">
          Appointmo — Intelligent Appointment Platform
        </p>
      </div>
    `;

    // 1. If Resend is configured, send via real email provider
    if (this.resendClient) {
      try {
        const { data, error } = await this.resendClient.emails.send({
          from: config.emailFrom,
          to: [recipientEmail],
          subject,
          text: textBody,
          html: htmlBody,
        });

        if (error) {
          console.error('Resend delivery failed:', error);
          return { success: false, isMock: false, error: error.message };
        }

        return { success: true, messageId: data?.id, isMock: false };
      } catch (err: any) {
        console.error('Resend API exception:', err);
        return { success: false, isMock: false, error: err.message || 'Email delivery exception' };
      }
    }

    // 2. Safe development fallback when no API key is set
    console.log('\n============================================================');
    console.log('📨 [DEV MOCK EMAIL SERVICE] (No RESEND_API_KEY configured)');
    console.log(`To: ${recipientEmail} (${recipientName})`);
    console.log(`Subject: ${subject}`);
    console.log(`Access Code: [ ${passcode} ]`);
    console.log(`Expires: ${expiresInMinutes} minutes`);
    console.log('============================================================\n');

    return {
      success: true,
      messageId: 'mock_' + Date.now(),
      isMock: true,
    };
  }
}
