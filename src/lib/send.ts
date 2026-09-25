import nodemailer from "nodemailer";

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
};

function transport(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
}

export async function verifySmtp(config: SmtpConfig): Promise<void> {
  const client = transport(config);
  try {
    await client.verify();
  } finally {
    client.close();
  }
}

export async function deliverMessage(input: {
  smtp: SmtpConfig;
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}): Promise<void> {
  const client = transport(input.smtp);
  try {
    await client.sendMail({
      from: input.from,
      to: input.to,
      replyTo: input.replyTo || undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: {
        "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });
  } finally {
    client.close();
  }
}
