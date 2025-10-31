/**
 * Database operations for reminder management
 */

export class ReminderDB {
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
   * Get a reminder by ID
   */
  async getReminder(id) {
    const { results } = await this.db
      .prepare('SELECT * FROM reminders WHERE id = ?')
      .bind(id)
      .all();

    return results[0];
  }

  /**
   * Create a new reminder
   */
  async createReminder(data) {
    const now = Math.floor(Date.now() / 1000);
    let nextSendAt;

    // 一次性提醒：使用指定的时间戳
    // 循环提醒：使用间隔天数计算
    if (data.is_one_time) {
      nextSendAt = data.scheduled_time || now;
    } else {
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
