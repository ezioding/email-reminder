// 全局变量
const API_BASE = '';  // Same origin

// 页面加载
document.addEventListener('DOMContentLoaded', () => {
    loadReminders();
});

// 切换提醒类型
function toggleReminderType() {
    const type = document.querySelector('input[name="reminderType"]:checked').value;
    const intervalDaysGroup = document.getElementById('intervalDaysGroup');
    const scheduledTimeGroup = document.getElementById('scheduledTimeGroup');
    const intervalDaysInput = document.getElementById('intervalDays');
    const scheduledTimeInput = document.getElementById('scheduledTime');

    if (type === 'onetime') {
        intervalDaysGroup.style.display = 'none';
        scheduledTimeGroup.style.display = 'block';
        intervalDaysInput.removeAttribute('required');
        scheduledTimeInput.setAttribute('required', 'required');
    } else {
        intervalDaysGroup.style.display = 'block';
        scheduledTimeGroup.style.display = 'none';
        intervalDaysInput.setAttribute('required', 'required');
        scheduledTimeInput.removeAttribute('required');
    }
}

// 加载提醒列表
async function loadReminders() {
    const loadingEl = document.getElementById('remindersLoading');
    const errorEl = document.getElementById('remindersError');
    const listEl = document.getElementById('remindersList');

    loadingEl.style.display = 'block';
    hideError(errorEl);
    listEl.innerHTML = '';

    try {
        const response = await fetch('/reminders');

        if (response.ok) {
            const data = await response.json();
            loadingEl.style.display = 'none';

            if (data.data && data.data.length > 0) {
                renderReminders(data.data);
            } else {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <h3>还没有提醒任务</h3>
                        <p>在上方表单中创建您的第一个提醒吧！</p>
                    </div>
                `;
            }
        } else {
            throw new Error('加载失败');
        }
    } catch (error) {
        loadingEl.style.display = 'none';
        showError(errorEl, '加载提醒列表失败: ' + error.message);
    }
}

// 渲染提醒列表
function renderReminders(reminders) {
    const listEl = document.getElementById('remindersList');
    listEl.innerHTML = reminders.map(reminder => `
        <div class="reminder-card ${reminder.enabled ? '' : 'disabled'}">
            <div class="reminder-header">
                <div>
                    <div class="reminder-title">${escapeHtml(reminder.title)}</div>
                    <span class="reminder-status ${reminder.enabled ? 'enabled' : 'disabled'}">
                        ${reminder.enabled ? '✓ 已启用' : '✗ 已禁用'}
                    </span>
                </div>
            </div>

            <div class="reminder-description">${escapeHtml(reminder.description)}</div>

            <div class="reminder-info">
                <div class="info-item">
                    <strong>📧 邮箱:</strong> ${escapeHtml(reminder.target_email)}
                </div>
                <div class="info-item">
                    <strong>🔔 类型:</strong> ${reminder.is_one_time ? '一次性提醒' : '循环提醒'}
                </div>
                ${!reminder.is_one_time ? `
                <div class="info-item">
                    <strong>⏱️ 间隔:</strong> ${reminder.interval_days} 天
                </div>
                ` : ''}
                <div class="info-item">
                    <strong>📊 已发送:</strong> ${reminder.sent_count} 次
                </div>
                <div class="info-item">
                    <strong>⏰ ${reminder.is_one_time ? '发送时间' : '下次发送'}:</strong> ${formatDate(reminder.next_send_at, reminder.is_one_time)}
                </div>
                ${reminder.url ? `
                <div class="info-item" style="grid-column: 1 / -1;">
                    <strong>🔗 链接:</strong>
                    <a href="${escapeHtml(reminder.url)}" target="_blank" class="reminder-link">
                        ${escapeHtml(reminder.url)}
                    </a>
                </div>
                ` : ''}
            </div>

            <div class="reminder-actions">
                <button onclick="editReminder(${reminder.id})" class="btn btn-primary btn-sm">
                    ✏️ 编辑
                </button>
                <button onclick="toggleReminder(${reminder.id}, ${reminder.enabled})"
                        class="btn ${reminder.enabled ? 'btn-warning' : 'btn-success'} btn-sm">
                    ${reminder.enabled ? '⏸️ 禁用' : '▶️ 启用'}
                </button>
                <button onclick="deleteReminder(${reminder.id}, '${escapeHtml(reminder.title)}')"
                        class="btn btn-danger btn-sm">
                    🗑️ 删除
                </button>
            </div>
        </div>
    `).join('');
}

// 添加提醒
async function addReminder(event) {
    event.preventDefault();

    const errorEl = document.getElementById('addError');
    const successEl = document.getElementById('addSuccess');
    hideError(errorEl);
    hideSuccess(successEl);

    const type = document.querySelector('input[name="reminderType"]:checked').value;
    const isOneTime = type === 'onetime';

    const data = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        url: document.getElementById('url').value.trim() || null,
        target_email: document.getElementById('targetEmail').value.trim(),
        is_one_time: isOneTime
    };

    if (isOneTime) {
        // 一次性提醒：使用指定的时间
        const scheduledTime = document.getElementById('scheduledTime').value;
        if (!scheduledTime) {
            showError(errorEl, '请选择提醒时间');
            return;
        }
        data.scheduled_time = Math.floor(new Date(scheduledTime).getTime() / 1000);
    } else {
        // 循环提醒：使用间隔天数
        data.interval_days = parseInt(document.getElementById('intervalDays').value);
    }

    try {
        const response = await fetch('/reminders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showSuccess(successEl, '提醒创建成功！');
            document.getElementById('addReminderForm').reset();
            loadReminders();

            // 3秒后隐藏成功消息
            setTimeout(() => hideSuccess(successEl), 3000);
        } else {
            const error = await response.json();
            showError(errorEl, error.error || '创建失败');
        }
    } catch (error) {
        showError(errorEl, '网络错误: ' + error.message);
    }
}

// 编辑提醒
async function editReminder(id) {
    try {
        const response = await fetch(`/reminders/${id}`);

        if (response.ok) {
            const result = await response.json();
            const reminder = result.data;

            // 填充表单
            document.getElementById('editId').value = reminder.id;
            document.getElementById('editIsOneTime').value = reminder.is_one_time ? '1' : '0';
            document.getElementById('editTitle').value = reminder.title;
            document.getElementById('editDescription').value = reminder.description;
            document.getElementById('editUrl').value = reminder.url || '';
            document.getElementById('editTargetEmail').value = reminder.target_email;

            // 显示提醒类型（只读）
            const typeText = reminder.is_one_time ? '🔔 一次性提醒（不可更改类型）' : '🔄 循环提醒（不可更改类型）';
            document.getElementById('editReminderType').textContent = typeText;

            // 根据类型显示不同的字段
            const intervalDaysGroup = document.getElementById('editIntervalDaysGroup');
            const scheduledTimeGroup = document.getElementById('editScheduledTimeGroup');
            const intervalDaysInput = document.getElementById('editIntervalDays');
            const scheduledTimeInput = document.getElementById('editScheduledTime');

            if (reminder.is_one_time) {
                // 一次性提醒：显示时间选择器
                intervalDaysGroup.style.display = 'none';
                scheduledTimeGroup.style.display = 'block';
                intervalDaysInput.removeAttribute('required');
                scheduledTimeInput.setAttribute('required', 'required');

                // 将 ISO 时间转换为 datetime-local 格式
                const date = new Date(reminder.next_send_at);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                scheduledTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
            } else {
                // 循环提醒：显示间隔天数
                intervalDaysGroup.style.display = 'block';
                scheduledTimeGroup.style.display = 'none';
                intervalDaysInput.setAttribute('required', 'required');
                scheduledTimeInput.removeAttribute('required');
                intervalDaysInput.value = reminder.interval_days;
            }

            // 显示模态框
            document.getElementById('editModal').classList.add('show');
        }
    } catch (error) {
        alert('加载提醒详情失败: ' + error.message);
    }
}

// 更新提醒
async function updateReminder(event) {
    event.preventDefault();

    const id = document.getElementById('editId').value;
    const isOneTime = document.getElementById('editIsOneTime').value === '1';
    const errorEl = document.getElementById('editError');
    hideError(errorEl);

    const data = {
        title: document.getElementById('editTitle').value.trim(),
        description: document.getElementById('editDescription').value.trim(),
        url: document.getElementById('editUrl').value.trim() || null,
        target_email: document.getElementById('editTargetEmail').value.trim()
    };

    if (isOneTime) {
        // 一次性提醒：使用指定的时间
        const scheduledTime = document.getElementById('editScheduledTime').value;
        if (!scheduledTime) {
            showError(errorEl, '请选择提醒时间');
            return;
        }
        data.scheduled_time = Math.floor(new Date(scheduledTime).getTime() / 1000);
    } else {
        // 循环提醒：使用间隔天数
        const intervalDays = parseInt(document.getElementById('editIntervalDays').value);
        if (!intervalDays || intervalDays < 1) {
            showError(errorEl, '间隔天数必须至少为1');
            return;
        }
        data.interval_days = intervalDays;
    }

    try {
        const response = await fetch(`/reminders/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeEditModal();
            loadReminders();
        } else {
            const error = await response.json();
            showError(errorEl, error.error || '更新失败');
        }
    } catch (error) {
        showError(errorEl, '网络错误: ' + error.message);
    }
}

// 切换提醒状态
async function toggleReminder(id, currentEnabled) {
    try {
        const response = await fetch(`/reminders/${id}/toggle`, {
            method: 'POST'
        });

        if (response.ok) {
            loadReminders();
        }
    } catch (error) {
        alert('操作失败: ' + error.message);
    }
}

// 删除提醒
async function deleteReminder(id, title) {
    if (!confirm(`确定要删除提醒 "${title}" 吗？此操作不可恢复。`)) {
        return;
    }

    try {
        const response = await fetch(`/reminders/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadReminders();
        } else {
            alert('删除失败');
        }
    } catch (error) {
        alert('网络错误: ' + error.message);
    }
}

// 手动触发检查
async function manualCheck() {
    const resultEl = document.getElementById('checkResult');
    resultEl.innerHTML = '<div class="loading">正在检查...</div>';

    try {
        const response = await fetch('/check', {
            method: 'POST'
        });

        if (response.ok) {
            const data = await response.json();
            const results = data.results;

            resultEl.innerHTML = `
                <div class="check-result">
                    <h4>✅ 检查完成</h4>
                    <div class="check-result-stats">
                        <div class="stat-item">
                            <div class="stat-number">${results.checked}</div>
                            <div class="stat-label">检查数量</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" style="color: #28a745;">${results.sent}</div>
                            <div class="stat-label">发送成功</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number" style="color: #dc3545;">${results.failed}</div>
                            <div class="stat-label">发送失败</div>
                        </div>
                    </div>
                    ${results.errors && results.errors.length > 0 ? `
                        <div style="margin-top: 15px; padding: 10px; background: #f8d7da; border-radius: 6px;">
                            <strong>错误详情:</strong>
                            <ul style="margin: 10px 0 0 20px;">
                                ${results.errors.map(e => `<li>${escapeHtml(e.title)}: ${escapeHtml(e.error)}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;

            // 刷新列表
            if (results.sent > 0) {
                loadReminders();
            }
        } else {
            resultEl.innerHTML = '<div class="error-message show">检查失败</div>';
        }
    } catch (error) {
        resultEl.innerHTML = `<div class="error-message show">网络错误: ${escapeHtml(error.message)}</div>`;
    }
}

// 关闭编辑模态框
function closeEditModal() {
    document.getElementById('editModal').classList.remove('show');
    document.getElementById('editError').classList.remove('show');
}

// 工具函数
function showError(el, message) {
    el.textContent = message;
    el.classList.add('show');
}

function hideError(el) {
    el.classList.remove('show');
}

function showSuccess(el, message) {
    el.textContent = message;
    el.classList.add('show');
}

function hideSuccess(el) {
    el.classList.remove('show');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(isoString, isOneTime = false) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.ceil(diffMs / (1000 * 60));

    // 对于一次性提醒，显示完整的日期和时间
    if (isOneTime) {
        const dateTimeStr = date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        // 添加相对时间提示
        if (diffMs < 0) {
            const absMinutes = Math.abs(diffMinutes);
            const absHours = Math.abs(diffHours);
            if (absMinutes < 60) {
                return `${dateTimeStr} (${absMinutes}分钟前)`;
            } else if (absHours < 24) {
                return `${dateTimeStr} (${absHours}小时前)`;
            } else {
                return `${dateTimeStr} (${Math.abs(diffDays)}天前)`;
            }
        } else if (diffMinutes < 60) {
            return `${dateTimeStr} (${diffMinutes}分钟后)`;
        } else if (diffHours < 24) {
            return `${dateTimeStr} (${diffHours}小时后)`;
        } else if (diffDays === 1) {
            return `${dateTimeStr} (明天)`;
        } else if (diffDays <= 7) {
            return `${dateTimeStr} (${diffDays}天后)`;
        } else {
            return dateTimeStr;
        }
    }

    // 对于循环提醒，只显示日期
    const dateStr = date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    if (diffDays < 0) {
        return `${dateStr} (已过期 ${Math.abs(diffDays)} 天)`;
    } else if (diffDays === 0) {
        return `${dateStr} (今天)`;
    } else if (diffDays === 1) {
        return `${dateStr} (明天)`;
    } else if (diffDays <= 7) {
        return `${dateStr} (${diffDays} 天后)`;
    } else {
        return dateStr;
    }
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
}
