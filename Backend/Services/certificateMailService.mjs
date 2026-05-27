import axios from 'axios';
import nodemailer from 'nodemailer';
import { buildCertificateHtml } from '../Utils/certificateHtml.mjs';
import { buildCertificatePdf } from '../Utils/certificatePdf.mjs';

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.MAIL_HOST || '';
  const port = Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587);
  const user = process.env.SMTP_USER || process.env.MAIL_USER || process.env.EMAIL_USER || '';
  const pass = process.env.SMTP_PASS || process.env.MAIL_PASS || process.env.EMAIL_PASS || '';

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP settings are incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS. ' +
      'You can also use MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS if that is how your hosting panel labels them.'
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: String(process.env.SMTP_SECURE || process.env.MAIL_SECURE || '').toLowerCase() === 'true' || port === 465,
    auth: { user, pass },
  });

  return transporter;
};

const resolveSender = () => {
  const sender =
    process.env.RESEND_FROM_EMAIL ||
    process.env.CERTIFICATE_FROM_EMAIL ||
    process.env.SMTP_FROM ||
    process.env.MAIL_FROM ||
    process.env.SMTP_USER ||
    process.env.MAIL_USER ||
    process.env.EMAIL_USER ||
    '';

  if (!sender) {
    throw new Error(
      'Certificate sender email is not configured. Set CERTIFICATE_FROM_EMAIL or SMTP_FROM. ' +
      'If you prefer, SMTP_USER can also serve as the sender address.'
    );
  }

  return sender;
};

const buildCertificateFilename = (record) => String(record.certificateNumber || 'certificate').replace(/[^A-Za-z0-9-_]/g, '-');

const sendWithResend = async ({ record, sender, subject, html, pdf }) => {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;

  const payload = {
    from: sender,
    to: [record.learnerEmail],
    subject,
    html,
    text: `Hello ${record.learnerName || 'Learner'}, your certificate is ready.`,
    attachments: [
      {
        filename: `${buildCertificateFilename(record)}.pdf`,
        content: pdf.toString('base64'),
      },
    ],
  };

  const replyTo = String(process.env.RESEND_REPLY_TO || process.env.CERTIFICATE_REPLY_TO || '').trim();
  if (replyTo) payload.reply_to = replyTo;

  const { data } = await axios.post('https://api.resend.com/emails', payload, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  return {
    provider: 'resend',
    id: data?.id || '',
  };
};

export const sendCertificateEmail = async (record) => {
  if (!record?.learnerEmail) {
    throw new Error('Learner email is required before sending the certificate');
  }

  const sender = resolveSender();
  const html = buildCertificateHtml(record, { autoPrint: false });
  const pdf = buildCertificatePdf(record);
  const subject = `Your Belle Kreyashon certificate${record.certificateTitle ? ` - ${record.certificateTitle}` : ''}`;
  const safeNumber = buildCertificateFilename(record);

  const resendResult = await sendWithResend({ record, sender, subject, html, pdf }).catch((error) => {
    error.message = `Resend send failed: ${error.response?.data?.message || error.message}`;
    throw error;
  });
  if (resendResult) return resendResult;

  const mailer = getTransporter();

  await mailer.sendMail({
    from: sender,
    to: record.learnerEmail,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.7">
        <p>Hello ${record.learnerName || 'Learner'},</p>
        <p>Your certificate${record.certificateTitle ? ` for <strong>${record.certificateTitle}</strong>` : ''} is ready.</p>
        <p>We attached your A4 landscape PDF certificate for easy viewing, printing and forwarding when needed.</p>
        <p>Thank you,<br/>Belle Kreyashon</p>
      </div>
    `,
    attachments: [
      {
        filename: `${safeNumber}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });

  return {
    provider: 'smtp',
    id: '',
  };
};
