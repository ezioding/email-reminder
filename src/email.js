/**
 * Email service integrations
 */

/**
 * Send email using MailChannels (Free for Cloudflare Workers)
 */
async function sendWithMailChannels(to, subject, html) {
  const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: {
        email: 'noreply@yourdomain.com',  // Configure your domain
        name: 'Email Reminder Service',
      },
      subject: subject,
      content: [
        {
          type: 'text/html',
          value: html,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`MailChannels error: ${response.status} ${await response.text()}`);
  }

  return response;
}

/**
 * Send email using Resend
 */
async function sendWithResend(to, subject, html, apiKey) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'noreply@yourdomain.com',  // Configure your domain
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend error: ${response.status} ${await response.text()}`);
  }

  return response;
}

/**
 * Generate email HTML template
 */
function generateEmailHTML(reminder) {
  const urlSection = reminder.url
    ? `<p>网址: <a href="${reminder.url}" style="color: #0066cc;">${reminder.url}</a></p>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${reminder.title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 20px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; color: #0066cc;">📅 定时提醒</h2>
        <h3 style="margin: 0; color: #333;">${reminder.title}</h3>
    </div>

    <div style="padding: 20px; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 5px;">
        <p style="font-size: 16px; margin-bottom: 15px;">${reminder.description}</p>
        ${urlSection}

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">

        <p style="font-size: 12px; color: #666;">
            这是一封自动提醒邮件，每隔 ${reminder.interval_days} 天发送一次。<br>
            已发送次数: ${reminder.sent_count + 1} 次
        </p>
    </div>

    <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px; font-size: 12px; color: #666; text-align: center;">
        <p style="margin: 0;">由 Email Reminder Service 自动发送</p>
    </div>
</body>
</html>
  `.trim();
}

/**
 * Main email sending function
 */
export async function sendReminderEmail(reminder, env) {
  const subject = `📅 提醒: ${reminder.title}`;
  const html = generateEmailHTML(reminder);

  try {
    if (env.EMAIL_SERVICE === 'resend') {
      await sendWithResend(reminder.target_email, subject, html, env.EMAIL_API_KEY);
    } else {
      // Default to MailChannels
      await sendWithMailChannels(reminder.target_email, subject, html);
    }

    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}
