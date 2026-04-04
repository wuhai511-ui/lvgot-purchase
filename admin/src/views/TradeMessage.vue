<template>
  <div class="page">
    <div class="page-title">🔔 交易消息</div>
    
    <!-- 筛选区域 -->
    <div class="filter-bar">
      <el-select v-model="filter.type" placeholder="消息类型" clearable style="width: 150px">
        <el-option label="全部" value="" />
        <el-option label="交易通知" value="trade" />
        <el-option label="分账通知" value="split" />
        <el-option label="提现通知" value="withdraw" />
        <el-option label="系统通知" value="system" />
      </el-select>
      <el-select v-model="filter.status" placeholder="阅读状态" clearable style="width: 120px">
        <el-option label="全部" value="" />
        <el-option label="未读" value="unread" />
        <el-option label="已读" value="read" />
      </el-select>
      <el-button type="primary" @click="handleMarkAllRead" :disabled="unreadCount === 0">
        全部已读
      </el-button>
    </div>

    <!-- 消息统计 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ totalCount }}</div>
        <div class="stat-label">全部消息</div>
      </div>
      <div class="stat-card unread">
        <div class="stat-value">{{ unreadCount }}</div>
        <div class="stat-label">未读消息</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ todayCount }}</div>
        <div class="stat-label">今日消息</div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="card">
      <div class="card-header">消息列表</div>
      <div class="card-body">
        <div class="message-list" v-loading="loading">
          <div 
            v-for="msg in filteredMessages" 
            :key="msg.id" 
            class="message-item"
            :class="{ unread: !msg.isRead }"
            @click="handleRead(msg)"
          >
            <div class="message-icon" :class="msg.type">
              <span v-if="msg.type === 'trade'">💰</span>
              <span v-else-if="msg.type === 'split'">📐</span>
              <span v-else-if="msg.type === 'withdraw'">📤</span>
              <span v-else>📢</span>
            </div>
            <div class="message-content">
              <div class="message-title">{{ msg.title }}</div>
              <div class="message-desc">{{ msg.content }}</div>
              <div class="message-time">{{ msg.createTime }}</div>
            </div>
            <div class="message-actions">
              <el-tag v-if="!msg.isRead" type="danger" size="small">未读</el-tag>
              <el-button type="primary" size="small" link @click.stop="handleDetail(msg)">
                查看详情
              </el-button>
            </div>
          </div>
          
          <el-empty v-if="filteredMessages.length === 0" description="暂无消息" />
        </div>
      </div>
    </div>

    <!-- 消息详情弹窗 -->
    <el-dialog v-model="showDetail" title="消息详情" width="500px">
      <div class="detail-content" v-if="currentMsg">
        <div class="detail-row">
          <span class="detail-label">消息类型：</span>
          <el-tag size="small">{{ getTypeName(currentMsg.type) }}</el-tag>
        </div>
        <div class="detail-row">
          <span class="detail-label">消息标题：</span>
          <span>{{ currentMsg.title }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">消息内容：</span>
          <span>{{ currentMsg.content }}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">创建时间：</span>
          <span>{{ currentMsg.createTime }}</span>
        </div>
        <div class="detail-row" v-if="currentMsg.extra">
          <span class="detail-label">关联信息：</span>
          <div class="extra-info">
            <div v-for="(value, key) in currentMsg.extra" :key="key">
              {{ key }}: {{ value }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button type="primary" v-if="currentMsg?.actionUrl" @click="handleAction(currentMsg)">
          前往处理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const showDetail = ref(false)
const currentMsg = ref(null)

const filter = ref({
  type: '',
  status: ''
})

// 模拟消息数据
const messages = ref([
  { id: 1, type: 'trade', title: '交易成功通知', content: '商户【张三商行】收到一笔交易，金额 ¥5,800.00', isRead: false, createTime: '2026-04-04 15:30:00', extra: { 订单号: 'TRD20260404001', 金额: '¥5,800.00' }, actionUrl: '/payment' },
  { id: 2, type: 'split', title: '分账成功通知', content: '分账订单【SP20260404001】已成功执行，分账金额 ¥2,320.00', isRead: false, createTime: '2026-04-04 14:20:00', extra: { 分账单号: 'SP20260404001', 收款方: '李四(导游)' }, actionUrl: '/split-record' },
  { id: 3, type: 'withdraw', title: '提现申请通知', content: '账户【LAK2026030001】申请提现 ¥10,000.00，预计T+1到账', isRead: true, createTime: '2026-04-04 10:15:00', extra: { 提现单号: 'WD20260404001', 银行卡: '尾号8888' }, actionUrl: '/withdraw' },
  { id: 4, type: 'system', title: '账户审核通过', content: '您的开户申请已审核通过，账户已激活', isRead: true, createTime: '2026-04-03 16:00:00', extra: null, actionUrl: '/account' },
  { id: 5, type: 'trade', title: '退款通知', content: '订单【TRD20260402001】已退款，金额 ¥500.00', isRead: true, createTime: '2026-04-02 11:30:00', extra: { 订单号: 'TRD20260402001', 退款金额: '¥500.00' }, actionUrl: '/payment' },
])

const filteredMessages = computed(() => {
  let result = messages.value
  if (filter.value.type) {
    result = result.filter(m => m.type === filter.value.type)
  }
  if (filter.value.status === 'unread') {
    result = result.filter(m => !m.isRead)
  } else if (filter.value.status === 'read') {
    result = result.filter(m => m.isRead)
  }
  return result
})

const totalCount = computed(() => messages.value.length)
const unreadCount = computed(() => messages.value.filter(m => !m.isRead).length)
const todayCount = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return messages.value.filter(m => m.createTime.startsWith(today)).length
})

const getTypeName = (type) => {
  const map = { trade: '交易通知', split: '分账通知', withdraw: '提现通知', system: '系统通知' }
  return map[type] || '未知'
}

const handleRead = (msg) => {
  if (!msg.isRead) {
    msg.isRead = true
  }
}

const handleDetail = (msg) => {
  currentMsg.value = msg
  showDetail.value = true
  if (!msg.isRead) {
    msg.isRead = true
  }
}

const handleAction = (msg) => {
  showDetail.value = false
  if (msg.actionUrl) {
    router.push(msg.actionUrl)
  }
}

const handleMarkAllRead = () => {
  messages.value.forEach(m => m.isRead = true)
  ElMessage.success('已全部标记为已读')
}

onMounted(() => {
  // 加载消息数据
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }

.filter-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }

.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card { background: #fff; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.stat-card.unread { background: linear-gradient(135deg, #FF5722, #FF9800); color: #fff; }
.stat-value { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.stat-label { font-size: 14px; color: #888; }
.stat-card.unread .stat-label { color: rgba(255,255,255,0.8); }

.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }

.message-list { display: flex; flex-direction: column; gap: 12px; }
.message-item { display: flex; align-items: flex-start; gap: 16px; padding: 16px; background: #f8f9fa; border-radius: 8px; cursor: pointer; transition: all 0.2s; border-left: 3px solid transparent; }
.message-item:hover { background: #e3f2fd; }
.message-item.unread { background: #fff3e0; border-left-color: #FF9800; }

.message-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; background: #e3f2fd; flex-shrink: 0; }
.message-icon.trade { background: #e8f5e9; }
.message-icon.split { background: #e3f2fd; }
.message-icon.withdraw { background: #fff3e0; }
.message-icon.system { background: #f3e5f5; }

.message-content { flex: 1; min-width: 0; }
.message-title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
.message-desc { font-size: 13px; color: #666; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.message-time { font-size: 12px; color: #999; }

.message-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.detail-content { padding: 12px 0; }
.detail-row { display: flex; margin-bottom: 16px; }
.detail-label { width: 80px; color: #888; flex-shrink: 0; }
.extra-info { background: #f5f5f5; padding: 12px; border-radius: 6px; font-size: 13px; line-height: 1.8; }
</style>
