// ── Brevo Transactional Email (HTTP REST API v3) ─────────────────────────────
// Uses HTTPS (Port 443) — 100% immune to SMTP port blocks & IPv6 DNS issues.
// Allows sending to ANY recipient email address on Brevo's free tier (300 emails/day).

async function sendEmail({ toEmail, toName, subject, html, text }) {
  const apiKey      = process.env.BREVO_API_KEY;
  const senderEmail = process.env.GMAIL_USER || 'jitendramishra223355@gmail.com';
  const senderName  = process.env.GMAIL_FROM_NAME || 'Jitendra Kumar Mishra';

  if (!apiKey || apiKey === 'your_brevo_api_key_here') {
    throw new Error('Brevo API key missing. Please set BREVO_API_KEY in environment variables.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey.trim(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail, name: toName || toEmail }],
      replyTo: { name: senderName, email: senderEmail },
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || data.code || 'Failed to send email via Brevo API');
  }

  return data;
}

module.exports = { sendEmail };
