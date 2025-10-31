# Email Reminder Worker

一个运行在 Cloudflare Workers 上的定时邮件提醒系统。支持创建多个提醒任务，按照设定的天数间隔自动发送提醒邮件。

## 预览

访问 Web 界面，轻松管理所有提醒任务：

- 🎨 现代化渐变设计
- 📱 完全响应式布局
- ⚡ 即时操作反馈
- 🔐 安全的认证系统

> 💡 **快速开始**：查看 [QUICKSTART.md](QUICKSTART.md) 快速部署指南（5 分钟上手）

## 功能特点

- ✅ **Web 图形界面** - 简洁美观的 Web UI，方便管理提醒任务
- ✅ 部署在 Cloudflare Workers，完全 serverless
- ✅ 使用 Cloudflare D1 (SQLite) 存储提醒任务
- ✅ 使用 Cloudflare Cron Triggers 实现定时检查
- ✅ 支持 MailChannels (免费) 或 Resend 发送邮件
- ✅ RESTful API 管理提醒任务
- ✅ 自动计算下次发送时间
- ✅ 支持启用/禁用提醒

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 D1 数据库

```bash
# 创建数据库
npx wrangler d1 create email-reminders

# 复制输出的 database_id 到 wrangler.toml 中
```

将输出的 `database_id` 替换到 `wrangler.toml` 文件中的 `YOUR_DATABASE_ID`。

### 3. 初始化数据库

```bash
# 生产环境
npm run db:init

# 本地开发环境
npm run db:local
```

### 4. 配置环境变量

```bash
# 创建本地开发配置
cp .dev.vars.example .dev.vars

# 编辑 .dev.vars 填入你的配置
```

生产环境需要设置 secrets：

```bash
# 设置管理员认证 token
npx wrangler secret put ADMIN_TOKEN

# 如果使用 Resend，设置 API key
npx wrangler secret put EMAIL_API_KEY
```

### 5. 配置邮件服务

#### 选项 A: MailChannels (推荐，免费)

1. 在 `wrangler.toml` 中设置 `EMAIL_SERVICE = "mailchannels"`
2. 修改 `src/email.js` 中的发件人邮箱
3. 按照 [MailChannels 文档](https://support.mailchannels.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Send-API) 配置你的域名 DNS

#### 选项 B: Resend

1. 注册 [Resend](https://resend.com/) 账号
2. 在 `wrangler.toml` 中设置 `EMAIL_SERVICE = "resend"`
3. 设置 `EMAIL_API_KEY` secret
4. 修改 `src/email.js` 中的发件人邮箱

### 6. 本地开发

```bash
npm run dev
```

### 7. 部署到 Cloudflare Workers

```bash
npm run deploy
```

部署成功后，访问你的 Worker URL (例如 `https://email-reminder-worker.your-account.workers.dev`) 即可看到 Web 管理界面！

## Web 界面使用

### 首次访问

1. 访问你的 Worker URL
2. 输入部署时设置的 `ADMIN_TOKEN`
3. 点击"登录"

### 管理提醒任务

Web 界面提供了完整的可视化管理功能：

- **添加提醒** - 填写表单创建新的提醒任务
- **查看列表** - 查看所有提醒任务及其状态
- **编辑提醒** - 点击"编辑"按钮修改提醒内容
- **启用/禁用** - 快速切换提醒的启用状态
- **删除提醒** - 移除不需要的提醒
- **手动触发** - 立即检查并发送到期的提醒

所有操作都在浏览器中完成，无需使用命令行！

## API 使用

所有 API 请求需要在 Header 中包含认证 token：

```bash
Authorization: Bearer YOUR_ADMIN_TOKEN
```

### 创建提醒

```bash
curl -X POST https://your-worker.workers.dev/reminders \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "登录 DigitalPlat",
    "description": "请登录 DigitalPlat 网站",
    "url": "https://dash.domain.digitalplat.org/",
    "target_email": "liudingandxiao@gmail.com",
    "interval_days": 180
  }'
```

### 获取所有提醒

```bash
curl https://your-worker.workers.dev/reminders \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 获取特定提醒

```bash
curl https://your-worker.workers.dev/reminders/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 更新提醒

```bash
curl -X PUT https://your-worker.workers.dev/reminders/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "interval_days": 90
  }'
```

### 启用/禁用提醒

```bash
curl -X POST https://your-worker.workers.dev/reminders/1/toggle \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 删除提醒

```bash
curl -X DELETE https://your-worker.workers.dev/reminders/1 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 手动触发检查

```bash
curl -X POST https://your-worker.workers.dev/check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 定时任务

默认配置为每天 UTC 时间 9:00 AM (北京时间下午 5:00) 检查并发送提醒邮件。

可以在 `wrangler.toml` 中修改 cron 表达式：

```toml
[triggers]
crons = ["0 9 * * *"]  # 每天 9:00 AM UTC
```

Cron 表达式格式：
- `"0 9 * * *"` - 每天 9:00 AM
- `"0 */6 * * *"` - 每 6 小时一次
- `"0 0 * * 0"` - 每周日午夜

## 数据库结构

```sql
CREATE TABLE reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,               -- 提醒标题
    description TEXT NOT NULL,          -- 提醒内容
    url TEXT,                          -- 相关链接
    target_email TEXT NOT NULL,         -- 接收邮箱
    interval_days INTEGER NOT NULL,     -- 间隔天数
    created_at INTEGER NOT NULL,        -- 创建时间 (Unix timestamp)
    last_sent_at INTEGER,              -- 上次发送时间
    next_send_at INTEGER NOT NULL,      -- 下次发送时间
    enabled INTEGER DEFAULT 1,          -- 是否启用 (0/1)
    sent_count INTEGER DEFAULT 0        -- 已发送次数
);
```

## 日志查看

查看 Worker 日志：

```bash
npm run tail
```

## 常见问题

### 1. 邮件没有发送？

- 检查 cron trigger 是否正确配置
- 查看 Worker 日志确认是否有错误
- 确认邮件服务配置正确
- 检查 `next_send_at` 时间是否已到

### 2. 如何修改 cron 执行频率？

编辑 `wrangler.toml` 中的 `crons` 配置，然后重新部署。

### 3. 如何备份数据？

```bash
# 导出数据库
npx wrangler d1 export email-reminders --output=backup.sql
```

### 4. 如何查看数据库内容？

```bash
# 进入数据库 shell
npx wrangler d1 execute email-reminders --command="SELECT * FROM reminders"
```

## 项目结构

```
.
├── src/
│   ├── index.js       # Worker 主入口
│   ├── database.js    # 数据库操作
│   ├── email.js       # 邮件发送
│   └── static.js      # 静态文件服务
├── public/
│   ├── index.html     # Web 管理界面
│   ├── styles.css     # 界面样式
│   └── app.js         # 前端交互逻辑
├── examples/
│   ├── api-examples.sh    # API 调用示例 (Bash)
│   └── api-examples.http  # API 调用示例 (REST Client)
├── schema.sql         # 数据库 schema
├── wrangler.toml      # Cloudflare Workers 配置
├── package.json       # 项目依赖
├── README.md          # 使用说明
├── DEPLOY.md          # 部署指南
└── CLAUDE.md          # 项目架构说明
```

## License

MIT
