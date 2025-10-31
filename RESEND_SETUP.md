# 配置 Resend 邮件服务

由于 MailChannels 现在需要域名验证，我们改用 **Resend**，它提供免费的邮件发送服务。

## 为什么选择 Resend？

- 每月免费 100 封邮件（对个人提醒足够）
- 简单易用的 API
- 无需域名验证即可使用测试域名
- 可靠的邮件投递

## 设置步骤

### 1. 注册 Resend 账号

访问：https://resend.com/signup

1. 使用您的邮箱注册
2. 验证邮箱地址
3. 登录到 Dashboard

### 2. 创建 API Key

1. 在 Resend Dashboard 中，点击 **API Keys**
2. 点击 **Create API Key**
3. 输入名称（如：email-reminder）
4. 权限选择 **Sending access**
5. 点击 **Add**
6. **复制生成的 API Key**（只显示一次！）

示例格式：`re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

### 3. 设置发件人邮箱

#### 选项 A：使用测试域名（快速开始）

Resend 提供了测试域名，可以立即使用：
- 发件人：`onboarding@resend.dev`
- **限制**：只能发送到您注册 Resend 时使用的邮箱

#### 选项 B：验证自己的域名（推荐）

1. 在 Resend Dashboard 中，点击 **Domains**
2. 点击 **Add Domain**
3. 输入您的域名（如：example.com）
4. 按照指示添加 DNS 记录（SPF、DKIM、DMARC）
5. 验证完成后，可以使用 `noreply@yourdomain.com` 作为发件人

### 4. 配置 Cloudflare Worker

使用您获取的 API Key 配置环境变量：

```bash
# 设置 Resend API Key
echo "your-resend-api-key" | npx wrangler secret put EMAIL_API_KEY

# 设置发件人邮箱
# 如果使用测试域名
echo "onboarding@resend.dev" | npx wrangler secret put EMAIL_FROM

# 如果使用自己的域名
echo "noreply@yourdomain.com" | npx wrangler secret put EMAIL_FROM
```

**实际命令示例**：
```bash
# 将下面的 re_xxxxxx 替换为您的真实 API Key
echo "re_123abc456def789ghi" | npx wrangler secret put EMAIL_API_KEY

# 如果使用测试域名
echo "onboarding@resend.dev" | npx wrangler secret put EMAIL_FROM
```

### 5. 重新部署

```bash
npx wrangler deploy
```

## 测试邮件发送

1. 登录 Web UI：https://email-reminder-worker.liudingandxiao.workers.dev/
2. 创建一个测试提醒：
   - 类型：一次性提醒
   - 时间：当前时间后 2 分钟
   - 接收邮箱：**您注册 Resend 时使用的邮箱**（如果使用测试域名）
3. 点击"立即检查"按钮
4. 查看邮箱（包括垃圾邮件文件夹）

## 常见问题

### Q: 使用测试域名有什么限制？

A: 测试域名 `onboarding@resend.dev` 只能发送邮件到您注册 Resend 时使用的邮箱地址。如果需要发送到其他邮箱，必须验证自己的域名。

### Q: 如何验证域名？

A:
1. 在 Resend Dashboard 中添加域名
2. 获取 DNS 记录（SPF、DKIM、DMARC）
3. 在您的域名提供商处添加这些 DNS 记录
4. 等待 DNS 传播（通常 5-30 分钟）
5. 在 Resend 中点击验证

### Q: 100 封邮件够用吗？

A: 对于个人提醒使用完全够用。假设：
- 5 个循环提醒，每个 180 天发送一次 = 每月约 1 封
- 偶尔的一次性提醒 = 每月约 5-10 封
- 总计：每月约 10-15 封邮件

### Q: 如何查看邮件发送历史？

A: 在 Resend Dashboard 的 **Emails** 页面可以查看所有发送的邮件状态和内容。

### Q: 邮件发送失败怎么办？

A:
1. 检查 Worker 日志：`npx wrangler tail`
2. 查看 Resend Dashboard 中的错误信息
3. 确认 API Key 正确配置
4. 确认发件人邮箱地址正确（测试域名或已验证的域名）

## 成本说明

- **免费额度**：每月 100 封邮件，3,000 封/天
- **付费计划**：如果需要更多，每月 $20 起（包含 50,000 封邮件）
- 对于个人提醒使用，免费额度完全足够

## 切换回 MailChannels

如果您有已验证的域名，也可以切换回 MailChannels：

1. 修改 `wrangler.toml`：
   ```toml
   [vars]
   EMAIL_SERVICE = "mailchannels"
   ```

2. 重新部署：
   ```bash
   npx wrangler deploy
   ```

但是 MailChannels 需要：
- 拥有自己的域名
- 添加 SPF 和 DKIM DNS 记录
- 配置较为复杂

对于个人使用，推荐使用 Resend！

---

**下一步**：按照上面的步骤设置 Resend 后，运行设置命令，然后告诉我，我会帮您重新部署并测试！
