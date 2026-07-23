const nodemailer = require('nodemailer');

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass || user === 'your_gmail@gmail.com') {
    console.warn('⚠️  Email not configured — set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    return null;
  }

  const transporter = nodemailer.createTransport({
    host:   'smtp.gmail.com',  // explicit host (avoids IPv6 DNS resolution)
    port:   587,               // STARTTLS — works on Render
    secure: false,             // upgrade via STARTTLS, not SSL
    family: 4,                 // ← force IPv4; fixes ENETUNREACH on Render
    auth:   { user, pass },
    tls: {
      rejectUnauthorized: true,
    },
  });

  return transporter;
}

module.exports = { getTransporter };

