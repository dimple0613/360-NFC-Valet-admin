import nodemailer from "nodemailer";

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return _transporter;
}

export async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[mail] SMTP not configured — skipping send to", to);
    return { sent: false, reason: "smtp_not_configured" };
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME;
  const fromField = fromName ? `"${fromName}" <${from}>` : from;
  await transporter.sendMail({ from: fromField, to, subject, html });
  return { sent: true };
}

export function buildResetEmail({ driverName, resetUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Reset Your Password</title>
</head>
<body style="margin:0;padding:0;background:#F6F7F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F9;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

  <!-- Header -->
  <tr>
    <td style="padding:32px 32px 24px;background:linear-gradient(135deg,#1C2B46 0%,#2A3F65 100%);">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td>
            <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#F4531F,#FF8A50);text-align:center;line-height:48px;">
              <span style="color:#FFFFFF;font-size:22px;font-weight:800;">360</span>
            </div>
          </td>
          <td style="padding-left:14px;vertical-align:middle;">
            <span style="color:#FFFFFF;font-size:18px;font-weight:800;letter-spacing:-0.3px;">360 NFC Valet</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 32px 16px;">
      <h2 style="margin:0 0 8px;color:#1C2B46;font-size:20px;font-weight:800;">Password Reset Request</h2>
      <p style="margin:0;color:#6C7A93;font-size:14px;line-height:22px;">
        Hi ${driverName || "Driver"},
      </p>
      <p style="margin:12px 0 0;color:#6C7A93;font-size:14px;line-height:22px;">
        We received a request to reset the password for your <strong style="color:#1C2B46;">360 NFC Valet</strong> driver account. Click the button below to set a new password. This link expires in <strong style="color:#1C2B46;">1 hour</strong>.
      </p>
    </td>
  </tr>

  <!-- CTA -->
  <tr>
    <td style="padding:8px 32px 32px;">
      <a href="${resetUrl}" target="_blank" style="display:block;text-align:center;background:linear-gradient(135deg,#F4531F,#FF8A50);color:#FFFFFF;font-size:15px;font-weight:800;text-decoration:none;padding:16px 24px;border-radius:99px;box-shadow:0 4px 16px rgba(244,83,31,0.3);">
        Reset My Password
      </a>
    </td>
  </tr>

  <!-- Divider -->
  <tr>
    <td style="padding:0 32px;">
      <hr style="border:none;border-top:1px solid #E7EAF0;margin:0;" />
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 32px 32px;">
      <p style="margin:0;color:#9AA6BC;font-size:12px;line-height:18px;text-align:center;">
        If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
      </p>
      <p style="margin:12px 0 0;color:#9AA6BC;font-size:11px;line-height:16px;text-align:center;">
        &copy; ${new Date().getFullYear()} 360 NFC Valet System
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}
