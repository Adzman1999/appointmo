import { Resend } from 'resend';
import { config } from '../config';

export interface SendApprovalNotificationOptions {
  recipientEmail: string;
  recipientName: string;
  setupUrl?: string;
  loginUrl: string;
}

export interface EmailServiceResult {
  success: boolean;
  messageId?: string;
  isMock: boolean;
  error?: string;
}

export class EmailService {
  private static resendClient: Resend | null = config.resendApiKey ? new Resend(config.resendApiKey) : null;

  /**
   * Sends an invitation notification email to an approved user.
   * Completely devoid of access codes or OTP passcodes.
   */
  static async sendApprovalNotification(options: SendApprovalNotificationOptions): Promise<EmailServiceResult> {
    const { recipientEmail, recipientName, setupUrl, loginUrl } = options;

    const actionUrl = setupUrl || loginUrl;
    const actionLabel = setupUrl ? 'Set Up Your Password & Explore' : 'Sign In to Appointmo';

    const subject = "You're invited to explore Appointmo";
    const textBody = `Hi ${recipientName},

Good news! Your request to explore Appointmo has been approved.

You can now sign in using the email address associated with your request and access the interactive demo.

${actionLabel}: ${actionUrl}

We're excited for you to explore a smarter way to manage appointments.

— The Appointmo Team`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1c1917; line-height: 1.6;">
        <div style="margin-bottom: 24px;">
          <span style="font-size: 20px; font-weight: 700; color: #1c1917; letter-spacing: -0.5px;">Appointmo</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #1c1917;">You're invited to explore Appointmo</h2>
        <p style="font-size: 15px; color: #44403c; margin-bottom: 16px;">
          Hi ${recipientName},
        </p>
        <p style="font-size: 15px; color: #44403c; margin-bottom: 24px;">
          Good news! Your request to explore Appointmo has been approved.<br><br>
          You can now sign in using the email address associated with your request and access the interactive demo.
        </p>
        <div style="margin: 28px 0;">
          <a href="${actionUrl}" style="background-color: #1c1917; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-weight: 600; text-decoration: none; font-size: 14px; display: inline-block;">
            ${actionLabel} &rarr;
          </a>
        </div>
        <p style="font-size: 14px; color: #57534e; margin-bottom: 24px;">
          We're excited for you to explore a smarter way to manage appointments.
        </p>
        <p style="font-size: 14px; color: #78716c;">
          — The Appointmo Team
        </p>
        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 32px 0 16px;" />
        <p style="font-size: 12px; color: #a8a29e;">
          Appointmo — Intelligent Salon &amp; Studio Scheduling Platform
        </p>
      </div>
    `;

    // 1. If Resend is configured, send via live transactional email provider
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
          console.error('❌ Resend API Error:', error);
          return {
            success: false,
            isMock: false,
            error: error.message || 'Resend failed to deliver email',
          };
        }

        console.log(`✅ Real email delivered to ${recipientEmail} (ID: ${data?.id})`);
        return {
          success: true,
          messageId: data?.id,
          isMock: false,
        };
      } catch (err: any) {
        console.error('❌ Resend Exception:', err);
        return {
          success: false,
          isMock: false,
          error: err.message || 'Network exception communicating with Resend',
        };
      }
    }

    // 2. Dev Mock Mode (No credentials required for local dev/testing)
    console.log(`
============================================================
📨 [DEV MOCK EMAIL SERVICE] (No RESEND_API_KEY configured)
To: ${recipientEmail} (${recipientName})
Subject: ${subject}
Action URL: ${actionUrl}
============================================================
`);

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      isMock: true,
    };
  }
}
