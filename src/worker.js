/**
 * Email Reminder Worker - All-in-one version
 * Combined all modules into single file for Cloudflare Workers deployment
 */

// ============================================================================
// DATABASE MODULE
// ============================================================================

class ReminderDB {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all reminders that are due to be sent
   */
  async getPendingReminders() {
    const now = Math.floor(Date.now() / 1000);
    const { results } = await this.db
      .prepare(
        `SELECT * FROM reminders
         WHERE enabled = 1 AND next_send_at <= ?
         ORDER BY next_send_at ASC`
      )
      .bind(now)
      .all();

    return results;
  }

  /**
   * Get all reminders
   */
  async getAllReminders() {
    const { results } = await this.db
      .prepare('SELECT * FROM reminders ORDER BY created_at DESC')
      .all();

    return results;
  }

  /**
   * Get reminder by ID
   */
  async getReminder(id) {
    const { results } = await this.db
      .prepare('SELECT * FROM reminders WHERE id = ?')
      .bind(id)
      .all();

    return results[0] || null;
  }

  /**
   * Create new reminder
   */
  async createReminder(data) {
    const now = Math.floor(Date.now() / 1000);
    let nextSendAt;

    if (data.is_one_time) {
      // 一次性提醒：使用指定的时间
      nextSendAt = data.scheduled_time || now;
    } else {
      // 循环提醒：使用间隔天数计算下次发送时间
      nextSendAt = now + (data.interval_days * 24 * 60 * 60);
    }

    const result = await this.db
      .prepare(
        `INSERT INTO reminders
         (title, description, url, target_email, interval_days, is_one_time, created_at, next_send_at, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(
        data.title,
        data.description,
        data.url || null,
        data.target_email,
        data.interval_days || null,
        data.is_one_time ? 1 : 0,
        now,
        nextSendAt
      )
      .run();

    return result.meta.last_row_id;
  }

  /**
   * Update reminder after sending
   */
  async updateAfterSend(id, intervalDays, isOneTime) {
    const now = Math.floor(Date.now() / 1000);

    if (isOneTime) {
      // 一次性提醒发送后直接禁用
      await this.db
        .prepare(
          `UPDATE reminders
           SET last_sent_at = ?, sent_count = sent_count + 1, enabled = 0
           WHERE id = ?`
        )
        .bind(now, id)
        .run();
    } else {
      // 循环提醒更新下次发送时间
      const nextSendAt = now + (intervalDays * 24 * 60 * 60);
      await this.db
        .prepare(
          `UPDATE reminders
           SET last_sent_at = ?, next_send_at = ?, sent_count = sent_count + 1
           WHERE id = ?`
        )
        .bind(now, nextSendAt, id)
        .run();
    }
  }

  /**
   * Enable/disable a reminder
   */
  async toggleReminder(id, enabled) {
    await this.db
      .prepare('UPDATE reminders SET enabled = ? WHERE id = ?')
      .bind(enabled ? 1 : 0, id)
      .run();
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(id) {
    await this.db
      .prepare('DELETE FROM reminders WHERE id = ?')
      .bind(id)
      .run();
  }

  /**
   * Update a reminder
   */
  async updateReminder(id, data) {
    const updates = [];
    const values = [];

    if (data.title !== undefined) {
      updates.push('title = ?');
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.url !== undefined) {
      updates.push('url = ?');
      values.push(data.url);
    }
    if (data.target_email !== undefined) {
      updates.push('target_email = ?');
      values.push(data.target_email);
    }
    if (data.interval_days !== undefined) {
      updates.push('interval_days = ?');
      values.push(data.interval_days);
    }
    // 一次性提醒更新时间时，更新 next_send_at
    if (data.scheduled_time !== undefined) {
      updates.push('next_send_at = ?');
      values.push(data.scheduled_time);
    }

    if (updates.length === 0) return;

    values.push(id);

    await this.db
      .prepare(`UPDATE reminders SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

// ============================================================================
// EMAIL MODULE
// ============================================================================

/**
 * Send email using MailChannels (Free for Cloudflare Workers)
 */
async function sendWithMailChannels(to, subject, html, fromEmail) {
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
        email: fromEmail,
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
    const error = await response.text();
    throw new Error(`MailChannels error: ${error}`);
  }

  return response;
}

/**
 * Send email using Resend API
 */
async function sendWithResend(to, subject, html, fromEmail, apiKey) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Resend API error:', errorText);
    throw new Error(`Resend error: ${errorText}`);
  }

  const result = await response.json();
  console.log('Email sent successfully:', result);
  return response;
}

/**
 * Send email using Brevo (Sendinblue) API
 * Free tier: 300 emails/day
 */
async function sendWithBrevo(to, subject, html, fromEmail, apiKey) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: fromEmail,
        name: 'Email Reminder Service',
      },
      to: [
        {
          email: to,
        },
      ],
      subject: subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Brevo API error:', errorText);
    throw new Error(`Brevo error: ${errorText}`);
  }

  const result = await response.json();
  console.log('Email sent successfully via Brevo:', result);
  return response;
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(reminder) {
  const urlSection = reminder.url
    ? `
        <div style="margin: 20px 0;">
            <a href="${reminder.url}"
               style="display: inline-block; background-color: #0066cc; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px;">
                点击访问
            </a>
        </div>
    `
    : '';

  // 根据提醒类型显示不同的信息
  const reminderTypeInfo = reminder.is_one_time
    ? '<p style="font-size: 12px; color: #666;">这是一封一次性提醒邮件。</p>'
    : `<p style="font-size: 12px; color: #666;">
         这是一封自动提醒邮件，每隔 ${reminder.interval_days} 天发送一次。<br>
         已发送次数: ${reminder.sent_count + 1} 次
       </p>`;

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

        ${reminderTypeInfo}
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
async function sendReminderEmail(reminder, env) {
  try {
    const subject = `📅 提醒: ${reminder.title}`;
    const html = generateEmailHTML(reminder);

    const service = env.EMAIL_SERVICE || 'mailchannels';
    const fromEmail = env.EMAIL_FROM || 'noreply@example.com';

    console.log(`Email config - Service: ${service}, From: ${fromEmail}, To: ${reminder.target_email}`);

    if (service === 'resend') {
      await sendWithResend(reminder.target_email, subject, html, fromEmail, env.EMAIL_API_KEY);
    } else if (service === 'brevo') {
      await sendWithBrevo(reminder.target_email, subject, html, fromEmail, env.EMAIL_API_KEY);
    } else {
      // Default to MailChannels
      await sendWithMailChannels(reminder.target_email, subject, html, fromEmail);
    }

    return { success: true };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// STATIC FILES MODULE
// ============================================================================

import indexHTML from '../public/index.html';
import stylesCSS from '../public/styles.css';
import appJS from '../public/app.js';

const staticFiles = {
  '/': indexHTML,
  '/index.html': indexHTML,
  '/styles.css': stylesCSS,
  '/app.js': appJS,
};

function serveStaticFile(path) {
  const content = staticFiles[path];

  if (!content) {
    return new Response('Not Found', { status: 404 });
  }

  // Determine content type based on path
  let contentType;
  if (path === '/' || path === '/index.html' || path.endsWith('.html')) {
    contentType = 'text/html; charset=utf-8';
  } else if (path.endsWith('.css')) {
    contentType = 'text/css; charset=utf-8';
  } else if (path.endsWith('.js')) {
    contentType = 'application/javascript; charset=utf-8';
  } else {
    contentType = 'text/plain; charset=utf-8';
  }

  return new Response(content, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

// ============================================================================
// MAIN WORKER LOGIC
// ============================================================================

/**
 * Handle scheduled cron triggers
 */
async function handleScheduled(env) {
  const db = new ReminderDB(env.DB);
  const results = {
    checked: 0,
    sent: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get all pending reminders
    const reminders = await db.getPendingReminders();
    results.checked = reminders.length;

    console.log(`Found ${reminders.length} pending reminders`);

    // Send emails for each pending reminder
    for (const reminder of reminders) {
      try {
        console.log(`Sending reminder: ${reminder.title} to ${reminder.target_email}`);

        const result = await sendReminderEmail(reminder, env);

        if (result.success) {
          // Update reminder for next send
          await db.updateAfterSend(reminder.id, reminder.interval_days, reminder.is_one_time);
          results.sent++;
          console.log(`✓ Sent reminder ${reminder.id}: ${reminder.title}`);
        } else {
          results.failed++;
          results.errors.push({
            id: reminder.id,
            title: reminder.title,
            error: result.error,
          });
          console.error(`✗ Failed to send reminder ${reminder.id}: ${result.error}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          id: reminder.id,
          title: reminder.title,
          error: error.message,
        });
        console.error(`✗ Error processing reminder ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in scheduled handler:', error);
    throw error;
  }

  return results;
}

/**
 * Handle HTTP requests (API endpoints)
 */
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Serve static files (HTML, CSS, JS)
  if (path === '/' || path === '/index.html' || path === '/styles.css' || path === '/app.js') {
    return serveStaticFile(path);
  }

  // API endpoints - no authentication required
  const db = new ReminderDB(env.DB);

  // GET /reminders - List all reminders
  if (path === '/reminders' && request.method === 'GET') {
    const reminders = await db.getAllReminders();
    return Response.json({
      success: true,
      data: reminders.map(r => formatReminder(r)),
    });
  }

  // GET /reminders/:id - Get specific reminder
  if (path.match(/^\/reminders\/\d+$/) && request.method === 'GET') {
    const id = parseInt(path.split('/')[2]);
    const reminder = await db.getReminder(id);

    if (!reminder) {
      return Response.json({ success: false, error: 'Reminder not found' }, { status: 404 });
    }

    return Response.json({
      success: true,
      data: formatReminder(reminder),
    });
  }

  // POST /reminders - Create new reminder
  if (path === '/reminders' && request.method === 'POST') {
    try {
      const body = await request.json();

      // Validation
      if (!body.title || !body.description || !body.target_email) {
        return Response.json({
          success: false,
          error: 'Missing required fields: title, description, target_email',
        }, { status: 400 });
      }

      // 一次性提醒需要 scheduled_time，循环提醒需要 interval_days
      if (body.is_one_time) {
        if (!body.scheduled_time) {
          return Response.json({
            success: false,
            error: 'scheduled_time is required for one-time reminders',
          }, { status: 400 });
        }
      } else {
        if (!body.interval_days || body.interval_days < 1) {
          return Response.json({
            success: false,
            error: 'interval_days must be at least 1 for recurring reminders',
          }, { status: 400 });
        }
      }

      const id = await db.createReminder(body);
      const reminder = await db.getReminder(id);

      return Response.json({
        success: true,
        message: 'Reminder created successfully',
        data: formatReminder(reminder),
      }, { status: 201 });
    } catch (error) {
      return Response.json({
        success: false,
        error: error.message,
      }, { status: 400 });
    }
  }

  // PUT /reminders/:id - Update reminder
  if (path.match(/^\/reminders\/\d+$/) && request.method === 'PUT') {
    try {
      const id = parseInt(path.split('/')[2]);
      const body = await request.json();

      await db.updateReminder(id, body);
      const reminder = await db.getReminder(id);

      return Response.json({
        success: true,
        message: 'Reminder updated successfully',
        data: formatReminder(reminder),
      });
    } catch (error) {
      return Response.json({
        success: false,
        error: error.message,
      }, { status: 400 });
    }
  }

  // POST /reminders/:id/toggle - Enable/disable reminder
  if (path.match(/^\/reminders\/\d+\/toggle$/) && request.method === 'POST') {
    const id = parseInt(path.split('/')[2]);
    const reminder = await db.getReminder(id);

    if (!reminder) {
      return Response.json({ success: false, error: 'Reminder not found' }, { status: 404 });
    }

    await db.toggleReminder(id, !reminder.enabled);
    const updated = await db.getReminder(id);

    return Response.json({
      success: true,
      message: `Reminder ${updated.enabled ? 'enabled' : 'disabled'}`,
      data: formatReminder(updated),
    });
  }

  // DELETE /reminders/:id - Delete reminder
  if (path.match(/^\/reminders\/\d+$/) && request.method === 'DELETE') {
    const id = parseInt(path.split('/')[2]);
    await db.deleteReminder(id);

    return Response.json({
      success: true,
      message: 'Reminder deleted successfully',
    });
  }

  // POST /check - Manually trigger reminder check
  if (path === '/check' && request.method === 'POST') {
    const results = await handleScheduled(env);
    return Response.json({
      success: true,
      message: 'Manual check completed',
      results,
    });
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Format reminder for API response
 */
function formatReminder(reminder) {
  return {
    id: reminder.id,
    title: reminder.title,
    description: reminder.description,
    url: reminder.url,
    target_email: reminder.target_email,
    interval_days: reminder.interval_days,
    is_one_time: Boolean(reminder.is_one_time),
    enabled: Boolean(reminder.enabled),
    sent_count: reminder.sent_count,
    created_at: new Date(reminder.created_at * 1000).toISOString(),
    last_sent_at: reminder.last_sent_at
      ? new Date(reminder.last_sent_at * 1000).toISOString()
      : null,
    next_send_at: new Date(reminder.next_send_at * 1000).toISOString(),
  };
}

// ============================================================================
// WORKER EXPORT
// ============================================================================

export default {
  async fetch(request, env, ctx) {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error('Error handling request:', error);
      return Response.json({
        success: false,
        error: 'Internal server error',
      }, { status: 500 });
    }
  },

  async scheduled(event, env, ctx) {
    console.log('Scheduled event triggered:', new Date(event.scheduledTime).toISOString());
    try {
      const results = await handleScheduled(env);
      console.log('Scheduled run completed:', results);
    } catch (error) {
      console.error('Error in scheduled handler:', error);
      throw error;
    }
  },
};
