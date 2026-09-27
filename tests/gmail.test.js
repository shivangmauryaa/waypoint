import test from "node:test";
import assert from "node:assert/strict";
import {
  gmailSmtpConfigured,
  sendGmailSmtpMessage,
} from "../server/gmail.js";

const env = {
  SMTP_HOST: "smtp.gmail.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "sender@gmail.com",
  SMTP_PASSWORD: "app-password",
  SMTP_FROM: "Waypoint <sender@gmail.com>",
};

test("Gmail SMTP requires a host, sender and authentication credentials", () => {
  assert.equal(gmailSmtpConfigured(env), true);
  assert.equal(gmailSmtpConfigured({ ...env, SMTP_PASSWORD: "" }), false);
  assert.equal(gmailSmtpConfigured({ ...env, SMTP_FROM: "" }), false);
});

test("Gmail SMTP sends the full administrator message through Nodemailer", async () => {
  let options;
  let message;
  const result = await sendGmailSmtpMessage(
    {
      to: "traveler@example.com",
      subject: "Trip check: 2 items to review",
      body: "1. Connection warning\nDetails for the first item.\n\n2. Transfer warning\nDetails for the second item.",
      html: "<h1>Trip alert</h1>",
      attachments: [{ filename: "mark.png", path: "public/icons/app-icon-192.png", cid: "logo" }],
    },
    env,
    (transportOptions) => {
      options = transportOptions;
      return {
        sendMail: async (mail) => {
          message = mail;
          return { messageId: "smtp-message-id" };
        },
      };
    },
  );

  assert.equal(result.messageId, "smtp-message-id");
  assert.equal(options.host, "smtp.gmail.com");
  assert.equal(options.port, 587);
  assert.equal(options.secure, false);
  assert.equal(options.auth.user, "sender@gmail.com");
  assert.equal(options.auth.pass, "app-password");
  assert.equal(message.from, "Waypoint <sender@gmail.com>");
  assert.equal(message.to, "traveler@example.com");
  assert.equal(message.subject, "Trip check: 2 items to review");
  assert.match(message.text, /Details for the first item/);
  assert.match(message.text, /Details for the second item/);
  assert.equal(message.html, "<h1>Trip alert</h1>");
  assert.equal(message.attachments[0].cid, "logo");
});

test("Gmail SMTP rejects missing credentials before creating a transport", async () => {
  let called = false;
  await assert.rejects(
    sendGmailSmtpMessage(
      { to: "traveler@example.com", subject: "Notice", body: "Details" },
      { ...env, SMTP_PASSWORD: "" },
      () => {
        called = true;
      },
    ),
    /Gmail SMTP credentials are not configured/,
  );
  assert.equal(called, false);
});

test("Gmail SMTP closes a stalled transport and returns a timeout", async () => {
  let closed = false;
  await assert.rejects(
    sendGmailSmtpMessage(
      { to: "traveler@example.com", subject: "Notice", body: "Details" },
      { ...env, SMTP_SEND_TIMEOUT_MS: "5" },
      () => ({
        sendMail: () => new Promise(() => {}),
        close: () => {
          closed = true;
        },
      }),
    ),
    /Gmail SMTP delivery timed out/,
  );
  assert.equal(closed, true);
});
