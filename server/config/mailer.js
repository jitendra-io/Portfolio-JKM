const { Resend } = require('resend');

// Resend uses HTTP (not SMTP), so it works on Render free tier
// Sign up at https://resend.com — free tier: 3,000 emails/month
function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key') {
    console.warn('⚠️  Resend API key not configured — set RESEND_API_KEY in environment.');
    return null;
  }
  return new Resend(apiKey);
}

module.exports = { getResendClient };
