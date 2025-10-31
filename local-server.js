/**
 * Simple local development server for testing the Web UI
 * Run with: node local-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8787;

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
};

// Mock data
const reminders = [
  {
    id: 1,
    title: '登录 DigitalPlat',
    description: '请登录 DigitalPlat 网站，避免账号过期',
    url: 'https://dash.domain.digitalplat.org/',
    target_email: 'liudingandxiao@gmail.com',
    interval_days: 180,
    is_one_time: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    last_sent_at: null,
    next_send_at: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString(),
    enabled: true,
    sent_count: 0,
  },
  {
    id: 2,
    title: '下午六点去健身房',
    description: '今天下午6点后记得去健身房锻炼',
    url: null,
    target_email: 'liudingandxiao@gmail.com',
    interval_days: null,
    is_one_time: true,
    created_at: new Date().toISOString(),
    last_sent_at: null,
    next_send_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), // 6小时后
    enabled: true,
    sent_count: 0,
  },
];

const ADMIN_TOKEN = 'test-admin-token-123';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  console.log(`${req.method} ${pathname}`);

  // Serve static files
  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, 'public/index.html', '.html');
    return;
  }

  if (pathname === '/styles.css') {
    serveFile(res, 'public/styles.css', '.css');
    return;
  }

  if (pathname === '/app.js') {
    serveFile(res, 'public/app.js', '.js');
    return;
  }

  // API endpoints
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!pathname.startsWith('/api') && pathname !== '/reminders' && pathname !== '/check' && !pathname.match(/^\/reminders\/\d+/)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  if (token !== ADMIN_TOKEN) {
    res.writeHead(401);
    res.end('Unauthorized');
    return;
  }

  // Handle API requests
  if (pathname === '/reminders' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      data: reminders,
    }));
    return;
  }

  if (pathname === '/reminders' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const data = JSON.parse(body);

      // 计算 next_send_at
      let nextSendAt;
      if (data.is_one_time) {
        // 一次性提醒：使用 scheduled_time
        nextSendAt = new Date(data.scheduled_time * 1000).toISOString();
      } else {
        // 循环提醒：使用 interval_days
        nextSendAt = new Date(Date.now() + data.interval_days * 24 * 60 * 60 * 1000).toISOString();
      }

      const newReminder = {
        id: reminders.length + 1,
        ...data,
        created_at: new Date().toISOString(),
        last_sent_at: null,
        next_send_at: nextSendAt,
        enabled: true,
        sent_count: 0,
      };
      reminders.push(newReminder);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Reminder created successfully',
        data: newReminder,
      }));
    });
    return;
  }

  if (pathname.match(/^\/reminders\/\d+$/) && req.method === 'GET') {
    const id = parseInt(pathname.split('/')[2]);
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, data: reminder }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    }
    return;
  }

  if (pathname.match(/^\/reminders\/\d+$/) && req.method === 'PUT') {
    const id = parseInt(pathname.split('/')[2]);
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        const data = JSON.parse(body);
        // 如果更新一次性提醒的时间，更新 next_send_at
        if (data.scheduled_time !== undefined) {
          data.next_send_at = new Date(data.scheduled_time * 1000).toISOString();
        }
        Object.assign(reminder, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Reminder updated successfully',
          data: reminder,
        }));
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    }
    return;
  }

  if (pathname.match(/^\/reminders\/\d+\/toggle$/) && req.method === 'POST') {
    const id = parseInt(pathname.split('/')[2]);
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
      reminder.enabled = !reminder.enabled;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: `Reminder ${reminder.enabled ? 'enabled' : 'disabled'}`,
        data: reminder,
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    }
    return;
  }

  if (pathname.match(/^\/reminders\/\d+$/) && req.method === 'DELETE') {
    const id = parseInt(pathname.split('/')[2]);
    const index = reminders.findIndex(r => r.id === id);
    if (index >= 0) {
      reminders.splice(index, 1);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Reminder deleted successfully',
      }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Not found' }));
    }
    return;
  }

  if (pathname === '/check' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: 'Manual check completed',
      results: {
        checked: 0,
        sent: 0,
        failed: 0,
        errors: [],
      },
    }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

function serveFile(res, filePath, ext) {
  const fullPath = path.join(__dirname, filePath);
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    res.end(data);
  });
}

server.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  Email Reminder - Local Test Server');
  console.log('========================================');
  console.log('');
  console.log(`  ➜  Local:   http://localhost:${PORT}/`);
  console.log('');
  console.log('  登录密钥: test-admin-token-123');
  console.log('');
  console.log('  按 Ctrl+C 停止服务器');
  console.log('');
  console.log('========================================');
});
