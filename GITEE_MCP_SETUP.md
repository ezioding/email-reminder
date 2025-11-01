# Gitee MCP 配置指南

本文档说明如何为 Claude Code 配置 Gitee MCP 服务器。

## 1. 找到 Claude Code 配置文件

### Windows
配置文件位置：
```
C:\Users\<你的用户名>\AppData\Roaming\Claude\claude_desktop_config.json
```

快速打开方式：
1. 按 `Win + R` 打开运行对话框
2. 输入 `%APPDATA%\Claude` 并回车
3. 如果目录不存在，手动创建 `Claude` 文件夹
4. 在该文件夹中创建 `claude_desktop_config.json` 文件

### macOS
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Linux
```
~/.config/Claude/claude_desktop_config.json
```

## 2. 配置内容

将以下内容复制到 `claude_desktop_config.json` 文件中：

```json
{
  "mcpServers": {
    "gitee": {
      "url": "https://api.gitee.com/mcp",
      "headers": {
        "Authorization": "Bearer ff079f18b8d4c82182b9e9dd5201a6f4"
      }
    }
  }
}
```

**重要提示：**
- 上述配置已包含您的 Gitee Personal Access Token
- 请妥善保管此文件，不要分享给他人
- 如果配置文件已存在其他 MCP 服务器，请合并配置

## 3. 合并现有配置（如果需要）

如果配置文件中已有其他 MCP 服务器，请按以下格式合并：

```json
{
  "mcpServers": {
    "existing-server": {
      // 现有配置...
    },
    "gitee": {
      "url": "https://api.gitee.com/mcp",
      "headers": {
        "Authorization": "Bearer ff079f18b8d4c82182b9e9dd5201a6f4"
      }
    }
  }
}
```

## 4. 重启 Claude Code

配置完成后，完全退出并重启 Claude Code 应用程序。

## 5. 验证配置

配置成功后，Claude Code 将能够：
- 直接访问 Gitee API
- 管理仓库
- 创建和管理 Issues
- 操作 Pull Requests
- 访问代码内容

## 6. 使用示例

配置完成后，您可以在 Claude Code 中直接请求：

```
帮我在 Gitee 上创建一个新仓库 email-reminder
```

```
列出我在 Gitee 上的所有仓库
```

```
将当前代码推送到 Gitee 仓库
```

## 7. Gitee Personal Access Token 权限

您的 token 应该具有以下权限：
- `projects` - 项目/仓库管理
- `pull_requests` - PR 管理
- `issues` - Issue 管理
- `notes` - 评论管理
- `keys` - SSH 密钥管理（可选）
- `hooks` - Webhook 管理（可选）

如需更新权限：
1. 访问 https://gitee.com/profile/personal_access_tokens
2. 找到您的 token 或创建新 token
3. 选择所需权限
4. 更新配置文件中的 token

## 8. 故障排除

### 问题：Claude Code 无法连接到 Gitee MCP

**解决方案：**
1. 检查配置文件路径是否正确
2. 验证 JSON 格式是否有效（可使用 https://jsonlint.com/ 验证）
3. 确认 token 是否正确且未过期
4. 检查网络连接
5. 查看 Claude Code 日志（如果可用）

### 问题：Token 失效

**解决方案：**
1. 访问 Gitee 重新生成 token
2. 更新配置文件中的 token
3. 重启 Claude Code

## 9. 安全建议

- ⚠️ **不要将包含 token 的配置文件提交到 Git 仓库**
- ⚠️ **定期更换 Personal Access Token**
- ⚠️ **只授予必要的最小权限**
- ⚠️ **如果 token 泄露，立即在 Gitee 中撤销**

## 10. 当前项目的 Git 配置

配置完成后，您还需要将本地仓库关联到 Gitee：

```bash
# 添加 Gitee 远程仓库
git remote add origin https://gitee.com/<你的用户名>/email-reminder.git

# 推送到 Gitee
git push -u origin master
```

---

**当前配置状态：**
- ✅ Gitee API Token: ff079f18b8d4c82182b9e9dd5201a6f4
- ⏳ 待完成：复制配置到 Claude Code 配置文件
- ⏳ 待完成：重启 Claude Code
- ⏳ 待完成：在 Gitee 创建远程仓库
