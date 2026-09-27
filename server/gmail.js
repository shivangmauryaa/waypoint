import nodemailer from "nodemailer";

export function gmailSmtpConfigured(env = process.env) {
  return Boolean(
    env.SMTP_HOST && env.SMTP_FROM && env.SMTP_USER && env.SMTP_PASSWORD,
  );
}

export async function sendGmailSmtpMessage(
  { to, subject, body, html, attachments },
  env = process.env,
  createTransport = nodemailer.createTransport,
) {
  if (!gmailSmtpConfigured(env)) {
    throw new Error("Gmail SMTP credentials are not configured.");
  }

  const transport = createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT || 587),
    secure: String(env.SMTP_SECURE).toLowerCase() === "true",
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  let timeout;

  try {
    const send = transport.sendMail({
      from: env.SMTP_FROM,
      replyTo: env.SMTP_REPLY_TO || undefined,
      to: String(to).trim(),
      subject,
      text: String(body || ""),
      ...(html ? { html } : {}),
      ...(attachments?.length ? { attachments } : {}),
      headers: { "Auto-Submitted": "auto-generated" },
    });
    const sendTimeoutMs = Number(env.SMTP_SEND_TIMEOUT_MS || 20000);
    return await Promise.race([
      send,
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          transport.close?.();
          reject(new Error("Gmail SMTP delivery timed out."));
        }, sendTimeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    transport.close?.();
  }
}
