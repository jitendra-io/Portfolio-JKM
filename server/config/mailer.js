const nodemailer = require('nodemailer');
const dns = require('dns');

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass || user === 'your_gmail@gmail.com') {
    console.warn('⚠️  Gmail credentials not configured.');
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: { user, pass },
    // Force IPv4 resolution to prevent ENETUNREACH IPv6 errors on Render
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, callback);
    },
  });
}

module.exports = { getTransporter };
