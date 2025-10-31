#!/bin/bash

# API Examples for Email Reminder Worker
# 使用前请先设置这两个变量

WORKER_URL="https://your-worker.workers.dev"
ADMIN_TOKEN="your-admin-token"

# ========================================
# 1. 查看 API 信息
# ========================================
echo "=== API Info ==="
curl "$WORKER_URL/" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

# ========================================
# 2. 创建新提醒
# ========================================
echo "=== Create Reminder ==="
curl -X POST "$WORKER_URL/reminders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "登录 DigitalPlat",
    "description": "请登录 DigitalPlat 网站",
    "url": "https://dash.domain.digitalplat.org/",
    "target_email": "liudingandxiao@gmail.com",
    "interval_days": 180
  }'
echo -e "\n"

# ========================================
# 3. 获取所有提醒
# ========================================
echo "=== List All Reminders ==="
curl "$WORKER_URL/reminders" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

# ========================================
# 4. 获取特定提醒 (ID=1)
# ========================================
echo "=== Get Reminder #1 ==="
curl "$WORKER_URL/reminders/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

# ========================================
# 5. 更新提醒 (修改间隔天数)
# ========================================
echo "=== Update Reminder #1 ==="
curl -X PUT "$WORKER_URL/reminders/1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "interval_days": 90
  }'
echo -e "\n"

# ========================================
# 6. 启用/禁用提醒
# ========================================
echo "=== Toggle Reminder #1 ==="
curl -X POST "$WORKER_URL/reminders/1/toggle" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

# ========================================
# 7. 手动触发检查 (测试用)
# ========================================
echo "=== Manual Check ==="
curl -X POST "$WORKER_URL/check" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
echo -e "\n"

# ========================================
# 8. 删除提醒
# ========================================
# echo "=== Delete Reminder #1 ==="
# curl -X DELETE "$WORKER_URL/reminders/1" \
#   -H "Authorization: Bearer $ADMIN_TOKEN"
# echo -e "\n"
