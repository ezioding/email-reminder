# 快速开始指南

5 分钟快速部署邮件提醒系统到 Cloudflare Workers！

## 前置要求

- [x] Cloudflare 账号（免费）
- [x] Node.js 16+ 已安装
- [x] 10 分钟时间

## 步骤 1: 克隆或下载代码

如果你已经有了这个项目的代码，跳到步骤 2。

## 步骤 2: 安装依赖

```bash
npm install
```

## 步骤 3: 登录 Cloudflare

```bash
npx wrangler login
```

这会打开浏览器，授权 Wrangler 访问你的 Cloudflare 账号。

## 步骤 4: 创建数据库

```bash
npx wrangler d1 create email-reminders
```

**重要：** 复制输出中的 `database_id`，看起来像这样：

```
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

打开 `wrangler.toml` 文件，找到第 13 行，替换 `YOUR_DATABASE_ID` 为你刚才复制的 ID。

## 步骤 5: 初始化数据库

```bash
npx wrangler d1 execute email-reminders --file=./schema.sql
```

## 步骤 6: 设置管理员密钥

```bash
npx wrangler secret put ADMIN_TOKEN
```

输入一个强密码（至少 20 个字符），例如：`my-super-secret-admin-token-2024`

**重要：** 记住这个密钥，你需要用它登录 Web 界面！

## 步骤 7: 配置邮件服务

### 选项 A: 使用 MailChannels (推荐，免费)

1. 打开 `src/email.js`
2. 找到第 16 行和第 38 行
3. 将 `noreply@yourdomain.com` 改为你的域名邮箱
4. 保存文件

> 注意：MailChannels 对 Cloudflare Workers 完全免费，但建议配置 DNS 记录以提高送达率。参见 [MailChannels 文档](https://support.mailchannels.com/hc/en-us/articles/4565898358413)。

### 选项 B: 使用 Resend

1. 注册 [Resend](https://resend.com/) 并获取 API Key
2. 编辑 `wrangler.toml`，将 `EMAIL_SERVICE` 改为 `"resend"`
3. 设置 API Key：
   ```bash
   npx wrangler secret put EMAIL_API_KEY
   ```
4. 打开 `src/email.js`，修改发件人邮箱为你在 Resend 验证的域名

## 步骤 8: 部署

```bash
npm run deploy
```

部署成功后，你会看到类似这样的输出：

```
Published email-reminder-worker (X.XX sec)
  https://email-reminder-worker.your-account.workers.dev
```

复制这个 URL！

## 步骤 9: 访问 Web 界面

1. 在浏览器中打开刚才的 URL
2. 输入步骤 6 中设置的 ADMIN_TOKEN
3. 点击"登录"

恭喜！🎉 你现在可以开始创建提醒任务了！

## 创建第一个提醒

在 Web 界面中：

1. 填写表单：
   - **提醒标题**：登录 DigitalPlat
   - **间隔天数**：180
   - **提醒内容**：请登录 DigitalPlat 网站，避免账号过期
   - **相关链接**：https://dash.domain.digitalplat.org/
   - **接收邮箱**：你的邮箱地址

2. 点击"创建提醒"

3. 在列表中查看新创建的提醒

## 测试邮件发送

想立即测试邮件功能？

1. 创建一个间隔为 1 天的测试提醒
2. 滚动到页面底部
3. 点击"立即检查"按钮
4. 等待几秒钟
5. 检查你的邮箱（包括垃圾邮件文件夹）

## 设置定时任务

默认情况下，系统每天 UTC 9:00 AM (北京时间 17:00) 自动检查并发送提醒。

想修改频率？编辑 `wrangler.toml` 第 20 行：

```toml
crons = ["0 9 * * *"]  # 每天 9:00 AM UTC
```

改为：

```toml
crons = ["0 */6 * * *"]  # 每 6 小时一次
```

然后重新部署：

```bash
npm run deploy
```

## 常用 Cron 表达式

- `"0 9 * * *"` - 每天 9:00 AM
- `"0 */6 * * *"` - 每 6 小时
- `"0 */12 * * *"` - 每 12 小时
- `"0 0 * * 0"` - 每周日午夜
- `"0 0 1 * *"` - 每月 1 号午夜

## 下一步

- 📖 阅读 [WEB_UI_GUIDE.md](WEB_UI_GUIDE.md) 了解界面详细使用方法
- 🔧 查看 [DEPLOY.md](DEPLOY.md) 了解高级部署选项
- 📚 查看 [README.md](README.md) 了解完整功能和 API

## 遇到问题？

### 部署失败

```bash
# 确认已登录
npx wrangler whoami

# 如果未登录，重新登录
npx wrangler login
```

### 邮件未发送

1. 检查 Worker 日志：
   ```bash
   npm run tail
   ```

2. 确认发件人邮箱配置正确

3. 检查接收邮箱的垃圾邮件文件夹

### 登录失败

确认输入的 ADMIN_TOKEN 与步骤 6 中设置的完全一致（区分大小写）。

如果忘记密钥，重新设置：

```bash
npx wrangler secret put ADMIN_TOKEN
npm run deploy
```

## 更多帮助

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [项目 Issues](提交问题到项目仓库)

祝你使用愉快！🚀
