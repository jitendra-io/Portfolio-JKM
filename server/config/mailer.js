const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass || user === 'your_gmail@gmail.com') {
    console.warn('⚠️  Email not configured — set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  return transporter;
}

module.exports = { getTransporter };
