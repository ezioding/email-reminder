# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an email reminder system built for Cloudflare Workers. It allows users to create scheduled reminders that send emails at specified intervals (e.g., every 180 days).

**Key Features:**
- Web-based UI for managing reminders (no command line required)
- RESTful API for programmatic access
- Automated email sending via cron triggers

**Tech Stack:**
- Cloudflare Workers (serverless runtime)
- Cloudflare D1 (SQLite database)
- Cloudflare Cron Triggers (scheduled tasks)
- MailChannels or Resend (email delivery)
- Vanilla JavaScript frontend (no frameworks)

## Development Commands

```bash
# Install dependencies
npm install

# Local development
npm run dev

# Deploy to Cloudflare
npm run deploy

# View logs
npm run tail

# Database initialization (production)
npm run db:init

# Database initialization (local)
npm run db:local

# Wrangler login
npx wrangler login

# Create D1 database
npx wrangler d1 create email-reminders

# Set secrets
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put EMAIL_API_KEY
```

## Architecture

### Core Components

1. **src/index.js** - Main worker entry point
   - Handles HTTP requests (REST API)
   - Handles scheduled cron triggers
   - Routes to appropriate handlers

2. **src/database.js** - Database operations
   - `ReminderDB` class wraps all D1 operations
   - Methods for CRUD operations on reminders
   - Handles timestamp calculations for scheduling

3. **src/email.js** - Email sending
   - Supports MailChannels (free for CF Workers) and Resend
   - Generates HTML email templates
   - Handles email delivery errors

### Data Flow

1. **Scheduled Flow (Cron):**
   - Cron trigger fires (default: daily at 9 AM UTC)
   - `handleScheduled()` queries pending reminders
   - For each reminder: send email → update `last_sent_at` and `next_send_at`
   - Logs results

2. **API Flow:**
   - HTTP request → authentication check → route to handler
   - CRUD operations modify D1 database
   - Return JSON responses

### Database Schema

The `reminders` table tracks all scheduled reminders:
- `next_send_at`: Unix timestamp for when to send next (indexed for performance)
- `interval_days`: Days between reminders
- `enabled`: Boolean flag to pause/resume reminders
- `sent_count`: Tracks how many times sent

See schema.sql:1-20 for full schema.

### Authentication

All API endpoints require Bearer token authentication via `ADMIN_TOKEN` secret. Set this before deployment.

### Email Configuration

Two supported providers:
- **MailChannels** (default): Free for Cloudflare Workers, requires domain DNS setup
- **Resend**: Paid service, easier setup, requires API key

Configure in wrangler.toml:15 via `EMAIL_SERVICE` variable.

## Important Notes

- Worker uses ES modules (not CommonJS)
- All timestamps stored as Unix seconds (not milliseconds)
- Cron expression in wrangler.toml:8 controls schedule frequency
- Database ID must be updated in wrangler.toml:13 after creating D1 database
- Email sender address must be configured in src/email.js:16 and src/email.js:38

## Deployment Checklist

See DEPLOY.md for detailed steps:
1. Create D1 database and update wrangler.toml
2. Initialize database schema
3. Configure email service (MailChannels or Resend)
4. Set ADMIN_TOKEN secret
5. Set EMAIL_API_KEY secret (if using Resend)
6. Deploy with `npm run deploy`
7. Test with `/check` endpoint

## API Endpoints

- `GET /` - API info
- `GET /reminders` - List all reminders
- `GET /reminders/:id` - Get specific reminder
- `POST /reminders` - Create new reminder
- `PUT /reminders/:id` - Update reminder
- `POST /reminders/:id/toggle` - Enable/disable reminder
- `DELETE /reminders/:id` - Delete reminder
- `POST /check` - Manually trigger reminder check

All endpoints require `Authorization: Bearer <ADMIN_TOKEN>` header.
