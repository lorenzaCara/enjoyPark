import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // usa SSL
  auth: {
    user: process.env.SMTP_USER, // la tua email gmail
    pass: process.env.SMTP_PASS, // password per app generata
  },
});

export const sendRecoveryEmail = async (to, recoveryCode) => {
  const info = await transporter.sendMail({
    from: `"Heptapod Park" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Recupero password - Codice',
    html: `
      <p>Ciao,</p>
      <p>Hai richiesto il recupero della tua password.</p>
      <p><strong>Codice di recupero:</strong> ${recoveryCode}</p>
      <p>Il codice è valido per 15 minuti.</p>
    `,
  });

  console.log('Email inviata con successo:', info);
  return info;
};
