/**
 * Email Reminder Worker - Main Entry Point
 * Cloudflare Worker for scheduled email reminders
 */

import { ReminderDB } from './database.js';
import { sendReminderEmail } from './email.js';
import { serveStaticFile } from './static.js';

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

  // Serve static files (HTML, CSS, JS) - no auth required
  if (path === '/' || path === '/index.html' || path === '/styles.css' || path === '/app.js') {
    return serveStaticFile(path);
  }

  // API endpoints require authentication
  const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (authToken !== env.ADMIN_TOKEN) {
    return new Response('Unauthorized', { status: 401 });
  }

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

/**
 * Main export - Cloudflare Worker entry point
 */
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
