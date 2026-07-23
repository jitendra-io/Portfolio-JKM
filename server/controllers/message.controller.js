const Message            = require('../models/Message');
const { getResendClient } = require('../config/mailer');

// ── POST /api/messages — public, submit a contact message ───────────────────
exports.createMessage = async (req, res, next) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      '';

    const doc = await Message.create({ name, email, subject, message, ip });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully!',
      data: { id: doc._id },
    });
  } catch (err) {
    // Mongoose validation errors → 400
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

// ── GET /api/messages — protected, get all messages (newest first) ──────────
exports.getAllMessages = async (req, res, next) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    const unreadCount = await Message.countDocuments({ read: false });
    res.json({ success: true, data: messages, unreadCount });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/messages/:id/read — protected, mark as read ──────────────────
exports.markAsRead = async (req, res, next) => {
  try {
    const doc = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!doc) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/messages/:id — protected ────────────────────────────────────
exports.deleteMessage = async (req, res, next) => {
  try {
    const doc = await Message.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Message not found.' });
    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/messages/:id/reply — protected, send email reply ───────────────
exports.replyToMessage = async (req, res, next) => {
  try {
    const { replyBody } = req.body;
    if (!replyBody || !replyBody.trim()) {
      return res.status(400).json({ success: false, message: 'Reply body cannot be empty.' });
    }

    const doc = await Message.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Message not found.' });

    const resend    = getResendClient();
    const fromName  = process.env.GMAIL_FROM_NAME || 'Jitendra Kumar Mishra';
    // Resend requires a verified domain — use onboarding@resend.dev for testing,
    // or your own verified domain email in production
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!resend) {
      return res.status(503).json({
        success: false,
        message: 'Email is not configured on the server. Please set RESEND_API_KEY in environment variables.',
      });
    }

    // ── Build a clean HTML email ──────────────────────────────────────────────
    const replyBodyHtml = replyBody.trim().replace(/\n/g, '<br>');
    const origBodyHtml  = doc.message.replace(/\n/g, '<br>');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;text-align:center;">
            <div style="font-size:1.5rem;font-weight:700;color:#fff;letter-spacing:-0.5px;">${fromName}</div>
            <div style="font-size:0.85rem;color:rgba(255,255,255,0.75);margin-top:4px;">Portfolio — Personal Reply</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;color:#555;font-size:0.9rem;">Hi <strong style="color:#111;">${doc.name}</strong>,</p>
            <div style="font-size:1rem;line-height:1.75;color:#333;margin:20px 0 28px;">${replyBodyHtml}</div>

            <div style="border-top:1px solid #e8e8e8;padding-top:24px;margin-top:8px;">
              <p style="margin:0 0 10px;font-size:0.75rem;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:1px;">Your original message</p>
              <div style="background:#f8f8fb;border-left:3px solid #8b5cf6;border-radius:0 8px 8px 0;padding:14px 18px;font-size:0.875rem;color:#666;line-height:1.65;">${origBodyHtml}</div>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8f8fb;padding:20px 40px;text-align:center;border-top:1px solid #e8e8e8;">
            <p style="margin:0;font-size:0.8rem;color:#999;">Sent from <a href="mailto:${fromEmail}" style="color:#6366f1;text-decoration:none;">${fromEmail}</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ── Send via Resend HTTP API (works on Render — no SMTP ports needed) ──────
    const { error } = await resend.emails.send({
      from:     `${fromName} <${fromEmail}>`,
      to:       [doc.email],
      reply_to: process.env.GMAIL_USER || fromEmail,
      subject:  `Re: ${doc.subject}`,
      html,
      text: replyBody.trim(),
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(502).json({ success: false, message: `Email delivery failed: ${error.message}` });
    }

    // ── Persist reply + mark as read ─────────────────────────────────────────
    doc.replies.push({ body: replyBody.trim(), sentFrom: fromEmail });
    doc.read = true;
    await doc.save();

    res.json({ success: true, message: `Reply sent to ${doc.email}`, data: doc });
  } catch (err) {
    console.error('Reply email error:', err);
    next(err);
  }
};

