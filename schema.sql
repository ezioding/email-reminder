-- Email Reminders Database Schema

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    url TEXT,
    target_email TEXT NOT NULL,
    interval_days INTEGER,
    is_one_time INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_sent_at INTEGER,
    next_send_at INTEGER NOT NULL,
    enabled INTEGER DEFAULT 1,
    sent_count INTEGER DEFAULT 0
);

-- Index for efficient querying of pending reminders
CREATE INDEX IF NOT EXISTS idx_next_send_enabled
ON reminders(next_send_at, enabled);

-- Sample data
INSERT INTO reminders (title, description, url, target_email, interval_days, created_at, next_send_at)
VALUES (
    '登录 DigitalPlat',
    '请登录 DigitalPlat 网站',
    'https://dash.domain.digitalplat.org/',
    'liudingandxiao@gmail.com',
    180,
    strftime('%s', 'now'),
    strftime('%s', 'now', '+180 days')
);
