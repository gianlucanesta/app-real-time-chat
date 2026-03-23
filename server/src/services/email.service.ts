import Mailjet from "node-mailjet";
import { env } from "../config/env.js";

const mailjet = new Mailjet.Client({
  apiKey: env.MAILJET_API_KEY,
  apiSecret: env.MAILJET_API_SECRET,
});

const FROM_EMAIL = process.env.MAILJET_FROM_EMAIL || "noreply@ephemeralchat.app";
const FROM_NAME = process.env.MAILJET_FROM_NAME || "Ephemeral Chat";

interface SendEmailOptions {
  to: string;
  toName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
}

async function sendEmail(opts: SendEmailOptions): Promise<void> {
  await mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: { Email: FROM_EMAIL, Name: FROM_NAME },
        To: [{ Email: opts.to, Name: opts.toName }],
        Subject: opts.subject,
        TextPart: opts.textBody,
        HTMLPart: opts.htmlBody,
      },
    ],
  });
}

/**
 * Send email verification link after registration.
 */
export async function sendVerificationEmail(
  to: string,
  displayName: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;

  await sendEmail({
    to,
    toName: displayName,
    subject: "Verify your email — Ephemeral Chat",
    textBody: `Hi ${displayName},\n\nPlease verify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, you can ignore this email.`,
    htmlBody: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #6366f1; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h1 style="color: #1a1a2e; font-size: 24px; margin: 0 0 8px;">Verify your email</h1>
          <p style="color: #64748b; font-size: 15px; margin: 0;">Hi ${displayName}, thanks for signing up!</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Verify Email Address</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #cbd5e1; font-size: 12px; text-align: center;">Ephemeral Chat</p>
      </div>
    `,
  });
}

/**
 * Send password reset link.
 */
export async function sendPasswordResetEmail(
  to: string,
  displayName: string,
  token: string,
): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;

  await sendEmail({
    to,
    toName: displayName,
    subject: "Reset your password — Ephemeral Chat",
    textBody: `Hi ${displayName},\n\nYou requested a password reset. Visit this link to set a new password:\n${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
    htmlBody: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: #6366f1; border-radius: 8px; padding: 12px; margin-bottom: 16px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h1 style="color: #1a1a2e; font-size: 24px; margin: 0 0 8px;">Reset your password</h1>
          <p style="color: #64748b; font-size: 15px; margin: 0;">Hi ${displayName}, we received a password reset request.</p>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">Reset Password</a>
        </div>
        <p style="color: #94a3b8; font-size: 13px; text-align: center;">This link expires in 1 hour. If you didn't request a reset, ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #cbd5e1; font-size: 12px; text-align: center;">Ephemeral Chat</p>
      </div>
    `,
  });
}
