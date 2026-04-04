<template>
  <div class="page">
    <div class="page-title">🤖 AI 智能分账</div>
    
    <div class="ai-split-container">
      <!-- 左侧对话区 -->
      <div class="chat-panel">
        <div class="chat-messages" ref="messageList">
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            class="message"
            :class="msg.role"
          >
            <div class="message-avatar">
              {{ msg.role === 'user' ? '👤' : '🤖' }}
            </div>
            <div class="message-content">
              <!-- 分账方案卡片 -->
              <div v-if="msg.type === 'split-result'" class="split-result-card">
                <div class="result-header">
                  <span class="result-title">📋 分账方案</span>
                  <el-tag type="success" size="small">置信度: {{ msg.confidence }}%</el-tag>
                </div>
                <el-table :data="msg.splitItems" size="small" stripe>
                  <el-table-column prop="name" label="收款方" width="120" />
                  <el-table-column prop="role" label="角色" width="100" />
                  <el-table-column prop="percent" label="比例" width="80">
                    <template #default="{row}">{{ row.percent }}%</template>
                  </el-table-column>
                  <el-table-column prop="amount" label="金额" width="120">
                    <template #default="{row}">
                      <span class="money">¥{{ row.amount }}</span>
                    </template>
                  </el-table-column>
                </el-table>
                <div class="result-total">
                  <span>总金额: </span>
                  <span class="total-amount">¥{{ msg.totalAmount }}</span>
                </div>
                <div class="result-actions">
                  <el-button type="primary" @click="confirmSplit(msg)">确认执行</el-button>
                  <el-button @click="editSplit(msg)">编辑调整</el-button>
                  <el-button @click="saveAsTemplate(msg)">保存为模板</el-button>
                </div>
              </div>
              
              <!-- 普通文本 -->
              <div v-else class="message-text">{{ msg.content }}</div>
            </div>
          </div>
          
          <!-- AI 思考中 -->
          <div v-if="thinking" class="message assistant thinking">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="thinking-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 输入区 -->
        <div class="input-area">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="3"
            placeholder="描述分账需求，如：把10000元按3:7分给导游和旅行社"
            @keydown.enter.ctrl="sendMessage"
          />
          <div class="input-actions">
            <span class="input-tip">💡 Ctrl+Enter 发送</span>
            <el-button type="primary" @click="sendMessage" :loading="thinking" :disabled="!inputText.trim()">
              发送
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 右侧模板区 -->
      <div class="template-panel">
        <div class="panel-title">📐 分账模板</div>
        
        <div class="template-list">
          <div 
            v-for="tpl in templates" 
            :key="tpl.template_id" 
            class="template-card"
            @click="useTemplate(tpl)"
          >
            <div class="tpl-header">
              <span class="tpl-icon">{{ tpl.icon || '📋' }}</span>
              <span class="tpl-name">{{ tpl.name }}</span>
            </div>
            <div class="tpl-desc">{{ tpl.description }}</div>
            <div class="tpl-items">
              <div v-for="(item, i) in tpl.items" :key="i" class="tpl-item">
                <span>{{ item.name }}</span>
                <span>{{ item.percent }}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <el-button class="create-template-btn" @click="$router.push('/split-template')">
          管理模板
        </el-button>
      </div>
    </div>
    
    <!-- 分账确认弹窗 -->
    <el-dialog v-model="showConfirmDialog" title="确认分账" width="500px">
      <div class="confirm-content" v-if="currentSplit">
        <div class="confirm-total">
          <span>分账总金额：</span>
          <span class="total-amount">¥{{ currentSplit.totalAmount }}</span>
        </div>
        <el-table :data="currentSplit.splitItems" stripe>
          <el-table-column prop="name" label="收款方" />
          <el-table-column prop="role" label="角色" />
          <el-table-column prop="percent" label="比例">
            <template #default="{row}">{{ row.percent }}%</template>
          </el-table-column>
          <el-table-column prop="amount" label="金额">
            <template #default="{row}">
              <span class="money">¥{{ row.amount }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="showConfirmDialog = false">取消</el-button>
        <el-button type="primary" @click="executeSplit" :loading="executing">
          确认分账
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const inputText = ref('')
const messages = ref([])
const thinking = ref(false)
const templates = ref([])
const showConfirmDialog = ref(false)
const currentSplit = ref(null)
const executing = ref(false)
const messageList = ref(null)

// 加载模板
const loadTemplates = async () => {
  try {
    const res = await axios.get('/api/split-templates')
    if (res.data.code === 0) {
      templates.value = res.data.data || []
    }
  } catch (e) {
    console.error('加载模板失败:', e)
  }
}

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || thinking.value) return
  
  // 添加用户消息
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  
  thinking.value = true
  await scrollToBottom()
  
  try {
    const res = await axios.post('/api/ai/parse-split', { text })
    
    thinking.value = false
    
    if (res.data.code === 0 && res.data.data.success) {
      const result = res.data.data
      messages.value.push({
        role: 'assistant',
        type: 'split-result',
        content: '已为您生成分账方案：',
        splitItems: result.items,
        totalAmount: result.totalAmount,
        confidence: result.confidence
      })
    } else {
      messages.value.push({
        role: 'assistant',
        content: res.data.data?.message || '抱歉，无法理解您的分账需求，请提供更详细的信息。'
      })
    }
  } catch (e) {
    thinking.value = false
    messages.value.push({
      role: 'assistant',
      content: '抱歉，处理您的请求时出现问题，请重试。'
    })
  }
  
  await scrollToBottom()
}

// 使用模板
const useTemplate = (tpl) => {
  const totalAmount = 10000
  const prompt = `使用模板"${tpl.name}"分账${totalAmount}元：${tpl.items.map(i => `${i.name}${i.percent}%`).join('、')}`
  inputText.value = prompt
  sendMessage()
}

// 确认分账
const confirmSplit = (msg) => {
  currentSplit.value = msg
  showConfirmDialog.value = true
}

// 编辑分账
const editSplit = (msg) => {
  messages.value.push({
    role: 'assistant',
    content: '请告诉我需要调整的内容，例如：\n• 导游改成50%\n• 增加一个分账对象：王五 10%\n• 总金额改为20000元'
  })
}

// 保存为模板
const saveAsTemplate = async (msg) => {
  try {
    const res = await axios.post('/api/split-templates', {
      name: `模板${Date.now().toString().slice(-6)}`,
      description: 'AI 生成的分账模板',
      items: msg.splitItems
    })
    
    if (res.data.code === 0) {
      ElMessage.success('模板保存成功')
      loadTemplates()
    }
  } catch (e) {
    ElMessage.error('保存模板失败')
  }
}

// 执行分账
const executeSplit = async () => {
  if (!currentSplit.value) return
  
  executing.value = true
  
  try {
    // 调用分账接口
    const res = await axios.post('/api/split/balance', {
      split_items: currentSplit.value.splitItems.map(item => ({
        target_merchant_id: item.merchant_id || 1,
        split_amount: parseFloat(item.amount)
      }))
    })
    
    executing.value = false
    showConfirmDialog.value = false
    
    if (res.data.code === 0) {
      messages.value.push({
        role: 'assistant',
        content: `✅ 分账成功！\n\n分账单号：${res.data.data?.order_no || 'SP' + Date.now()}\n总金额：¥${currentSplit.value.totalAmount}\n\n分账明细已发送至各收款方。`
      })
      ElMessage.success('分账成功')
    } else {
      ElMessage.error(res.data.message || '分账失败')
    }
  } catch (e) {
    executing.value = false
    ElMessage.error('分账请求失败')
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight
  }
}

onMounted(() => {
  loadTemplates()
  
  // 欢迎消息
  messages.value.push({
    role: 'assistant',
    content: '您好！我是 AI 分账助手。\n\n请告诉我您的分账需求，例如：\n• 把10000元按3:7分给导游和旅行社\n• 导游李四分60%，司机张三分40%，共5000元\n• 使用旅行团标准模板分账8000元'
  })
})
</script>

<style scoped>
.page { padding: 20px 24px; height: calc(100vh - 100px); }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }

.ai-split-container {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 20px;
  height: calc(100% - 60px);
}

.chat-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  
  &.user {
    flex-direction: row-reverse;
    
    .message-content {
      background: #1976D2;
      color: #fff;
      border-radius: 16px 16px 4px 16px;
    }
  }
  
  &.assistant {
    .message-content {
      background: #f5f5f5;
      border-radius: 16px 16px 16px 4px;
    }
  }
  
  &.thinking {
    .message-content {
      padding: 16px 24px;
    }
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
}

.message-text {
  white-space: pre-wrap;
}

.thinking-dots {
  display: flex;
  gap: 4px;
  
  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ccc;
    animation: bounce 1.4s infinite ease-in-out both;
    
    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }
}

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.split-result-card {
  min-width: 400px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-title {
  font-weight: 600;
  font-size: 15px;
}

.result-total {
  text-align: right;
  margin-top: 12px;
  font-size: 14px;
}

.total-amount {
  font-size: 18px;
  font-weight: 700;
  color: #1976D2;
}

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.input-area {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.input-tip {
  font-size: 12px;
  color: #888;
}

.template-panel {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.template-list {
  flex: 1;
  overflow-y: auto;
}

.template-card {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #e3f2fd;
  }
}

.tpl-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tpl-icon {
  font-size: 18px;
}

.tpl-name {
  font-weight: 600;
  font-size: 14px;
}

.tpl-desc {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.tpl-items {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tpl-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.create-template-btn {
  margin-top: 16px;
}

.confirm-content {
  padding: 12px 0;
}

.confirm-total {
  text-align: right;
  margin-bottom: 16px;
  font-size: 15px;
}

.money {
  color: #1976D2;
  font-weight: 600;
}
</style>
