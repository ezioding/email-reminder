# 部署指南

详细的部署步骤说明。

## 前置要求

1. Cloudflare 账号
2. 已安装 Node.js (v16+)
3. 已安装 npm

## 步骤 1: 克隆并安装

```bash
# 安装依赖
npm install

# 登录 Cloudflare (如果还没登录)
npx wrangler login
```

## 步骤 2: 创建 D1 数据库

```bash
# 创建数据库
npx wrangler d1 create email-reminders
```

你会看到类似这样的输出：

```
✅ Successfully created DB 'email-reminders'!

[[d1_databases]]
binding = "DB"
database_name = "email-reminders"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

复制 `database_id`，替换 `wrangler.toml` 文件中的 `YOUR_DATABASE_ID`。

## 步骤 3: 初始化数据库表

```bash
# 创建表结构
npx wrangler d1 execute email-reminders --file=./schema.sql
```

## 步骤 4: 配置邮件服务

### 使用 MailChannels (推荐)

MailChannels 对 Cloudflare Workers 免费。

1. 编辑 `src/email.js`，修改发件人邮箱：

```javascript
from: {
  email: 'noreply@yourdomain.com',  // 改为你的域名
  name: 'Email Reminder Service',
}
```

2. 配置域名 DNS（可选但推荐）：

按照 [MailChannels 文档](https://support.mailchannels.com/hc/en-us/articles/4565898358413) 添加 SPF 和 DKIM 记录。

### 使用 Resend

1. 注册 [Resend](https://resend.com/) 账号

2. 获取 API Key

3. 编辑 `wrangler.toml`：

```toml
[vars]
EMAIL_SERVICE = "resend"
```

4. 编辑 `src/email.js`，修改发件人邮箱：

```javascript
from: 'noreply@yourdomain.com',  // 改为你在 Resend 验证的域名
```

## 步骤 5: 设置 Secrets

```bash
# 设置管理员 token (用于 API 认证)
npx wrangler secret put ADMIN_TOKEN
# 输入一个强密码，比如: my-super-secret-token-12345

# 如果使用 Resend，设置 API key
npx wrangler secret put EMAIL_API_KEY
# 输入你的 Resend API key
```

## 步骤 6: 部署

```bash
npm run deploy
```

部署成功后，你会看到 Worker 的 URL，类似：

```
https://email-reminder-worker.your-account.workers.dev
```

## 步骤 7: 验证部署

### 测试 API

```bash
# 替换 YOUR_WORKER_URL 和 YOUR_ADMIN_TOKEN
curl https://YOUR_WORKER_URL/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

应该返回 API 信息。

### 创建第一个提醒

```bash
curl -X POST https://YOUR_WORKER_URL/reminders \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "登录 DigitalPlat",
    "description": "请登录 DigitalPlat 网站",
    "url": "https://dash.domain.digitalplat.org/",
    "target_email": "your-email@gmail.com",
    "interval_days": 180
  }'
```

### 手动测试邮件发送

为了测试邮件功能，可以创建一个马上触发的提醒：

```bash
# 创建一个 1 天间隔的测试提醒
curl -X POST https://YOUR_WORKER_URL/reminders \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试提醒",
    "description": "这是一封测试邮件",
    "target_email": "your-email@gmail.com",
    "interval_days": 1
  }'

# 手动触发检查
curl -X POST https://YOUR_WORKER_URL/check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

检查你的邮箱，应该会收到提醒邮件。

## 步骤 8: 配置 Cron Trigger

Cron trigger 已经在 `wrangler.toml` 中配置，部署后自动生效。

默认配置：每天 UTC 9:00 AM (北京时间下午 5:00)

可以修改 `wrangler.toml` 中的配置：

```toml
[triggers]
crons = ["0 9 * * *"]  # 修改这里
```

然后重新部署。

## 步骤 9: 监控和日志

### 查看实时日志

```bash
npm run tail
```

### 查看 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 Workers & Pages
3. 点击你的 Worker
4. 查看 Analytics 和 Logs

## 本地开发

如果需要在本地测试：

```bash
# 1. 创建本地配置
cp .dev.vars.example .dev.vars

# 2. 编辑 .dev.vars，填入配置

# 3. 初始化本地数据库
npm run db:local

# 4. 启动本地开发服务器
npm run dev
```

本地服务器会运行在 `http://localhost:8787`

## 更新部署

修改代码后重新部署：

```bash
npm run deploy
```

## 故障排除

### 1. 部署失败

```bash
# 确认已登录
npx wrangler whoami

# 重新登录
npx wrangler login
```

### 2. 数据库错误

```bash
# 检查数据库状态
npx wrangler d1 list

# 查看表结构
npx wrangler d1 execute email-reminders --command="SELECT sql FROM sqlite_master WHERE type='table'"
```

### 3. 邮件发送失败

- 检查邮件服务配置
- 查看 Worker 日志: `npm run tail`
- 确认发件人邮箱格式正确
- 如果使用 MailChannels，检查域名配置

### 4. Cron 未执行

- Cron trigger 可能需要几分钟生效
- 在 Cloudflare Dashboard 中检查 Cron Triggers 配置
- 使用 `/check` endpoint 手动触发测试

## 安全建议

1. 使用强密码作为 `ADMIN_TOKEN`
2. 不要将 `.dev.vars` 提交到 Git
3. 定期更新依赖: `npm update`
4. 如果暴露到公网，考虑添加 rate limiting

## 成本

- Cloudflare Workers: 免费额度 100,000 请求/天
- D1 Database: 免费额度 5GB 存储
- MailChannels: 对 Cloudflare Workers 完全免费
- Resend: 免费额度 3,000 邮件/月

正常使用情况下，完全可以在免费额度内运行。
