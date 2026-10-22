import { Resend } from 'resend';
import { config } from '../config';

export interface SendApprovalNotificationOptions {
  recipientEmail: string;
  recipientName: string;
  setupUrl?: string;
  loginUrl: string;
}

export interface SendStoreCreationPendingOptions {
  recipientEmail: string;
  recipientName: string;
  storeName: string;
}

export interface SendStoreApprovalOptions {
  recipientEmail: string;
  recipientName: string;
  storeName: string;
  storeSlug: string;
  loginUrl: string;
  tempPassword?: string;
  password?: string;
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
   * Sends confirmation email when a user registers or launches a new store,
   * informing them that approval takes 1-2 business days.
   */
  static async sendStoreCreationPendingEmail(options: SendStoreCreationPendingOptions): Promise<EmailServiceResult> {
    const { recipientEmail, recipientName, storeName } = options;

    const subject = `Your store "${storeName}" is successfully created — Appointmo Verification`;
    const textBody = `Hi ${recipientName},

Your store "${storeName}" has been successfully created!

Please wait 1 to 2 business days for our Super Admin team to review and fully approve your store.

Once approved, you will receive an official notification with your Store Admin credentials and direct sign-in link to manage your store dashboard, appointment slots, staff specialists, and operational settings.

Thank you for choosing Appointmo!

— The Appointmo Super Admin Team`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #1c1917; line-height: 1.6; background-color: #fafaf9; border-radius: 16px; border: 1px solid #e7e5e4;">
        <div style="margin-bottom: 24px; display: flex; align-items: center;">
          <span style="font-size: 22px; font-weight: 800; color: #1c1917; letter-spacing: -0.5px;">Appointmo</span>
          <span style="margin-left: 8px; font-size: 11px; font-weight: 700; background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">Store Creation</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #1c1917;">Your store is successfully created!</h2>
        <p style="font-size: 15px; color: #44403c; margin-bottom: 16px;">
          Hi <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 15px; color: #44403c; margin-bottom: 20px;">
          Thank you for registering <strong>${storeName}</strong> on Appointmo.
        </p>
        <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #854d0e;">
            ⏳ Verification Notice:
          </p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #713f12;">
            Please allow <strong>1 to 2 business days</strong> for our Super Admin team to review and verify your store details before full portal access is granted.
          </p>
        </div>
        <p style="font-size: 14px; color: #57534e; margin-bottom: 20px;">
          What happens next?
        </p>
        <ul style="font-size: 14px; color: #57534e; padding-left: 20px; margin-bottom: 24px;">
          <li style="margin-bottom: 8px;">Our Super Admin verifies your business category, location, and contact information.</li>
          <li style="margin-bottom: 8px;">You will receive an approval email granting your <strong>Store Admin</strong> role.</li>
          <li>You can then sign in directly to manage your store logo, services, staff, appointment slots, and operational status.</li>
        </ul>
        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 28px 0 20px;" />
        <p style="font-size: 13px; color: #78716c; margin-bottom: 4px;">
          Best regards,
        </p>
        <p style="font-size: 14px; font-weight: 600; color: #1c1917;">
          The Appointmo Team
        </p>
      </div>
    `;

    return this.dispatchEmail(recipientEmail, subject, textBody, htmlBody);
  }

  /**
   * Sends email when Super Admin approves the store, delivering Store Admin role confirmation & sign-in link.
   */
  static async sendStoreApprovalEmail(options: SendStoreApprovalOptions): Promise<EmailServiceResult> {
    const { recipientEmail, recipientName, storeName, storeSlug, loginUrl, tempPassword, password } = options;
    const deliveredPassword = password || tempPassword;

    const subject = `Approved! Your store "${storeName}" is now active on Appointmo`;
    const textBody = `Hi ${recipientName},

Congratulations! Your store "${storeName}" has been officially approved by the Appointmo Super Admin team.

Your account role has been elevated to Store Admin. You now have full access to your store management dashboard.

Store Portal: ${loginUrl}
Store Slug: ${storeSlug}
Email: ${recipientEmail}
${deliveredPassword ? `Account Password: ${deliveredPassword}\n` : ''}
Inside your Store Admin portal, you can customize:
- Store Logo & Description
- Staff Specialists & Rosters
- Appointment Slots & Working Hours
- Service Menu & Pricing
- Operational Status (Open / Temporarily Closed)

Sign in now to begin taking online bookings!

— The Appointmo Super Admin Team`;

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #1c1917; line-height: 1.6; background-color: #fafaf9; border-radius: 16px; border: 1px solid #e7e5e4;">
        <div style="margin-bottom: 24px; display: flex; align-items: center;">
          <span style="font-size: 22px; font-weight: 800; color: #1c1917; letter-spacing: -0.5px;">Appointmo</span>
          <span style="margin-left: 8px; font-size: 11px; font-weight: 700; background-color: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">Store Approved</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 16px; color: #1c1917;">Welcome to Appointmo! Your Store is Approved</h2>
        <p style="font-size: 15px; color: #44403c; margin-bottom: 16px;">
          Hi <strong>${recipientName}</strong>,
        </p>
        <p style="font-size: 15px; color: #44403c; margin-bottom: 20px;">
          Congratulations! Your store <strong>${storeName}</strong> has been officially approved by the Super Admin team.
        </p>
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <div style="font-size: 13px; font-weight: 700; color: #78716c; text-transform: uppercase; margin-bottom: 12px;">Store Admin Credentials &amp; Access</div>
          <div style="font-size: 14px; margin-bottom: 8px;"><strong>Store Name:</strong> ${storeName}</div>
          <div style="font-size: 14px; margin-bottom: 8px;"><strong>Assigned Role:</strong> <span style="background-color: #f43f5e; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 700;">Store Admin</span></div>
          <div style="font-size: 14px; margin-bottom: 8px;"><strong>Registered Email / Username:</strong> <code>${recipientEmail}</code></div>
          ${deliveredPassword ? `<div style="font-size: 14px; margin-bottom: 8px; background-color: #fef2f2; border: 1px solid #fecaca; padding: 8px 12px; border-radius: 8px;"><strong>Password:</strong> <code style="font-size: 15px; font-weight: bold; color: #991b1b;">${deliveredPassword}</code></div>` : ''}
          <div style="font-size: 14px; margin-bottom: 8px;"><strong>Store Slug:</strong> <code>${storeSlug}</code></div>
        </div>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${loginUrl}" style="background-color: #1c1917; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 15px; display: inline-block;">
            Sign In to Store Admin Dashboard &rarr;
          </a>
        </div>
        <p style="font-size: 14px; color: #57534e; margin-bottom: 16px;">
          In your Store Admin dashboard, you can now configure:
        </p>
        <ul style="font-size: 14px; color: #57534e; padding-left: 20px; margin-bottom: 24px;">
          <li style="margin-bottom: 6px;">Store branding, logo, and tagline</li>
          <li style="margin-bottom: 6px;">Staff specialists &amp; service assignments</li>
          <li style="margin-bottom: 6px;">Appointment slots &amp; working hours</li>
          <li style="margin-bottom: 6px;">Service pricing and categories</li>
          <li>Store operational status (Open / Temporarily Closed)</li>
        </ul>
        <hr style="border: none; border-top: 1px solid #e7e5e4; margin: 28px 0 20px;" />
        <p style="font-size: 13px; color: #78716c; margin-bottom: 4px;">
          Happy bookings,
        </p>
        <p style="font-size: 14px; font-weight: 600; color: #1c1917;">
          The Appointmo Team
        </p>
      </div>
    `;

    return this.dispatchEmail(recipientEmail, subject, textBody, htmlBody);
  }

  /**
   * Helper to dispatch email via Resend or log as dev mock.
   */
  private static async dispatchEmail(recipientEmail: string, subject: string, textBody: string, htmlBody: string): Promise<EmailServiceResult> {
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

    // Dev Mock Mode
    console.log(`
============================================================
📨 [DEV MOCK EMAIL SERVICE] (No RESEND_API_KEY configured)
To: ${recipientEmail}
Subject: ${subject}
============================================================
${textBody}
============================================================
`);

    return {
      success: true,
      messageId: `mock_${Date.now()}`,
      isMock: true,
    };
  }

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

    return this.dispatchEmail(recipientEmail, subject, textBody, htmlBody);
  }
}
