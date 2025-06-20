import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // uses SSL
  auth: {
    user: process.env.SMTP_USER, // Your Gmail address
    pass: process.env.SMTP_PASS, 
  },
});

export const sendRecoveryEmail = async (to, recoveryCode) => {
  const info = await transporter.sendMail({
    from: `"Heptapod Park" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Password Recovery - Code',
    html: `
      <p>Hello,</p>
      <p>You requested to recover your password.</p>
      <p><strong>Recovery Code:</strong> ${recoveryCode}</p>
      <p>The code is valid for 15 minutes.</p>
    `,
  });

  console.log('Email successfully sent:', info);
  return info;
};
