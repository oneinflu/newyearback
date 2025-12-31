const Mailgun = require("mailgun.js");
const formData = require("form-data");
const os = require("os");
const appName = process.env.APP_NAME || "INFLU";
const apiKey = process.env.MAILGUN_API_KEY || "";
const domain = process.env.MAILGUN_DOMAIN || "";
const endpoint = process.env.MAILGUN_URL || "";

let client = null;
function getClient() {
  if (!client && apiKey) {
    const mailgun = new Mailgun(formData);
    client = mailgun.client({
      username: "api",
      key: apiKey,
      ...(endpoint ? { url: endpoint } : {})
    });
  }
  return client;
}

async function sendEmail({ to, subject, text, html, from }) {
  try {
    if (!apiKey || !domain) {
      return { ok: false, error: "mailgun_not_configured" };
    }
    const mg = getClient();
    const toList = Array.isArray(to) ? to.filter(Boolean) : [to];
    if (!toList.length) return { ok: false, error: "no_recipient" };
    const fromAddr = from || `${appName} <postmaster@${domain}>`;
    const res = await mg.messages.create(domain, {
      from: fromAddr,
      to: toList,
      subject,
      text,
      ...(html ? { html } : {})
    });
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

function formatOtpEmail({ code, minutes = 10, context = "verification" }) {
  const subj = `${appName} ${context} code`;
  const txt = [
    `Your ${appName} ${context} code is: ${code}`,
    `This code expires in ${minutes} minutes.`,
    `If you didn’t request this, you can ignore this email.`
  ].join("\n");
  const html = renderBrandedHtml({
    title: `${appName} ${context} code`,
    otp: code,
    minutes,
    context
  });
  return { subject: subj, text: txt, html };
}

function renderBrandedHtml({ title, otp, minutes = 10, context = "verification" }) {
  const safeTitle = String(title || `${appName} ${context} code`);
  const year = new Date().getFullYear();
  return `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle}</title>
    <style>
      html, body { margin:0; padding:0; }
      body {
        background: #f6f7fb;
        color: #6d1feaff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .container {
        max-width: 560px;
        margin: 32px auto;
        background: #ffffff;
        border-radius: 16px;
        box-shadow: 0 8px 24px rgba(101, 50, 241, 0.08);
        overflow: hidden;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 24px;
        background: #6d1feaff;
        color: #ffffff;
      }
      .brand-name {
        font-weight: 700;
        font-size: 16px;
        letter-spacing: 0.4px;
      }
      .content {
        padding: 24px;
      }
      h1 {
        font-size: 20px;
        line-height: 28px;
        margin: 0 0 12px 0;
      }
      p {
        font-size: 14px;
        line-height: 22px;
        margin: 0 0 12px 0;
        color: #383355ff;
      }
      .otp {
        margin: 16px 0 20px 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 4px;
        color: #6d1feaff;
        background: #eef2ff;
        border: 1px solid #c7d2fe;
        border-radius: 12px;
        padding: 16px 20px;
        text-align: center;
      }
      .note {
        font-size: 12px;
        color: #64748b;
      }
      .footer {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
        font-size: 12px;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="brand">
        <!-- <img src="LOGO_URL_HERE" alt="${appName} logo" width="120" style="display:block"> -->
        <div class="brand-name">${appName}</div>
      </div>
      <div class="content">
        <h1>Your ${appName} ${context} code</h1>
        <p>Use the code below to continue. Do not share this code with anyone.</p>
        <div class="otp">${otp}</div>
        <p>This code expires in ${minutes} minutes.</p>
        <p class="note">If you did not request this, you can safely ignore this email.</p>
        <div class="footer">
          &copy; ${year} ${appName}.
        </div>
      </div>
    </div>
  </body>
</html>
`;
}

module.exports = {
  sendEmail,
  formatOtpEmail
};
