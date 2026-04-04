<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">🤖 AI 智能分账</text>
    </view>

    <!-- AI 对话区域 -->
    <view class="chat-area">
      <view class="chat-messages" ref="messageList">
        <view 
          v-for="(msg, index) in messages" 
          :key="index" 
          class="message"
          :class="msg.role"
        >
          <view class="message-avatar">
            {{ msg.role === 'user' ? '👤' : '🤖' }}
          </view>
          <view class="message-content">
            <!-- AI 返回的分账方案 -->
            <view v-if="msg.type === 'split-result'" class="split-result-card">
              <view class="result-header">
                <text class="result-title">📋 分账方案</text>
                <text class="result-confidence">置信度: {{ msg.confidence }}%</text>
              </view>
              <view class="split-items">
                <view v-for="(item, i) in msg.splitItems" :key="i" class="split-item-preview">
                  <view class="item-name">{{ item.name }}</view>
                  <view class="item-role">{{ item.role }}</view>
                  <view class="item-amount">¥{{ item.amount }}</view>
                  <view class="item-percent">{{ item.percent }}%</view>
                </view>
              </view>
              <view class="result-total">
                <text>总金额: ¥{{ msg.totalAmount }}</text>
              </view>
              <view class="result-actions">
                <van-button type="primary" size="small" @click="confirmSplit(msg)">确认执行</van-button>
                <van-button size="small" @click="editSplit(msg)">编辑调整</van-button>
              </view>
            </view>
            
            <!-- 模板推荐 -->
            <view v-else-if="msg.type === 'template-suggest'" class="template-suggest">
              <view class="suggest-title">💡 推荐使用模板</view>
              <view class="template-list">
                <view 
                  v-for="(tpl, i) in msg.templates" 
                  :key="i" 
                  class="template-item"
                  @click="useTemplate(tpl)"
                >
                  <view class="tpl-name">{{ tpl.name }}</view>
                  <view class="tpl-desc">{{ tpl.description }}</view>
                </view>
              </view>
            </view>
            
            <!-- 普通文本消息 -->
            <view v-else class="message-text">{{ msg.content }}</view>
          </view>
        </view>
        
        <!-- AI 思考中 -->
        <view v-if="thinking" class="message assistant thinking">
          <view class="message-avatar">🤖</view>
          <view class="message-content">
            <view class="thinking-dots">
              <span></span><span></span><span></span>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷模板 -->
    <view class="quick-templates" v-if="messages.length === 0">
      <view class="qt-title">🎯 快捷模板</view>
      <view class="qt-list">
        <view class="qt-item" @click="useQuickTemplate('tour')">
          <text class="qt-emoji">🎒</text>
          <text class="qt-text">旅行团分账</text>
        </view>
        <view class="qt-item" @click="useQuickTemplate('shop')">
          <text class="qt-emoji">🏪</text>
          <text class="qt-text">商店返佣</text>
        </view>
        <view class="qt-item" @click="useQuickTemplate('guide')">
          <text class="qt-emoji">👨‍✈️</text>
          <text class="qt-text">导游结算</text>
        </view>
        <view class="qt-item" @click="useQuickTemplate('custom')">
          <text class="qt-emoji">✨</text>
          <text class="qt-text">自定义</text>
        </view>
      </view>
    </view>

    <!-- 输入区域 -->
    <view class="input-area">
      <view class="input-wrapper">
        <input 
          class="chat-input" 
          v-model="inputText" 
          placeholder="描述分账需求，如：把10000元按3:7分给导游和旅行社"
          @confirm="sendMessage"
        />
        <van-button type="primary" size="small" @click="sendMessage" :disabled="!inputText.trim()">
          发送
        </van-button>
      </view>
      <view class="input-tips">
        <text>💡 试试说："把5000元分给导游李四60%，司机张三40%"</text>
      </view>
    </view>

    <!-- 分账确认弹窗 -->
    <van-popup v-model:show="showConfirmPopup" position="bottom" round>
      <view class="confirm-popup">
        <view class="confirm-title">确认分账</view>
        <view class="confirm-list">
          <view v-for="(item, i) in confirmItems" :key="i" class="confirm-item">
            <view class="ci-info">
              <text class="ci-name">{{ item.name }}</text>
              <text class="ci-role">{{ item.role }}</text>
            </view>
            <view class="ci-amount">¥{{ item.amount }}</view>
          </view>
        </view>
        <view class="confirm-total">
          <text>合计：</text>
          <text class="total-amount">¥{{ confirmTotal }}</text>
        </view>
        <view class="confirm-actions">
          <van-button block type="primary" round @click="executeSplit" :loading="executing">
            确认分账
          </van-button>
        </view>
      </view>
    </van-popup>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useAccountStore } from '@/store/account'

const accountStore = useAccountStore()

const inputText = ref('')
const messages = ref([])
const thinking = ref(false)
const showConfirmPopup = ref(false)
const confirmItems = ref([])
const executing = ref(false)

// 快捷模板
const quickTemplates = {
  tour: {
    name: '旅行团分账',
    prompt: '这是一个旅行团订单，总金额10000元，请按以下比例分账：旅行社30%，导游李四40%，司机张三20%，平台10%'
  },
  shop: {
    name: '商店返佣',
    prompt: '商店消费返佣，总金额5000元，旅行社60%，导游30%，平台10%'
  },
  guide: {
    name: '导游结算',
    prompt: '导游李四本周带团3个，应结算金额6000元'
  },
  custom: {
    name: '自定义分账',
    prompt: ''
  }
}

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text) return
  
  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: text
  })
  inputText.value = ''
  
  // AI 思考
  thinking.value = true
  await scrollToBottom()
  
  try {
    // 调用 AI 解析接口
    const result = await parseWithAI(text)
    
    thinking.value = false
    
    if (result.type === 'split') {
      // 返回分账方案
      messages.value.push({
        role: 'assistant',
        type: 'split-result',
        content: '已为您生成分账方案：',
        splitItems: result.items,
        totalAmount: result.totalAmount,
        confidence: result.confidence
      })
    } else if (result.type === 'template') {
      // 推荐模板
      messages.value.push({
        role: 'assistant',
        type: 'template-suggest',
        templates: result.templates
      })
    } else {
      // 普通回复
      messages.value.push({
        role: 'assistant',
        content: result.message || '我理解您的需求，请提供更多细节，比如分账金额和比例。'
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

// AI 解析（模拟，实际应调用后端 AI 接口）
const parseWithAI = async (text) => {
  // 模拟 API 延迟
  await new Promise(r => setTimeout(r, 1500))
  
  // 简单的自然语言解析逻辑
  // 实际应调用 GPT/Claude 等 AI 模型
  
  const amountMatch = text.match(/(\d+(?:\.\d+)?)\s*元/)
  const totalAmount = amountMatch ? parseFloat(amountMatch[1]) : 10000
  
  // 检测分账对象
  const items = []
  
  if (text.includes('导游') || text.includes('李四')) {
    const guideMatch = text.match(/导游[^0-9]*(\d+)%/)
    const guidePercent = guideMatch ? parseInt(guideMatch[1]) : 40
    items.push({
      name: '李四(导游)',
      role: '导游',
      percent: guidePercent,
      amount: (totalAmount * guidePercent / 100).toFixed(2)
    })
  }
  
  if (text.includes('司机') || text.includes('张三')) {
    const driverMatch = text.match(/司机[^0-9]*(\d+)%/)
    const driverPercent = driverMatch ? parseInt(driverMatch[1]) : 20
    items.push({
      name: '张三(司机)',
      role: '司机',
      percent: driverPercent,
      amount: (totalAmount * driverPercent / 100).toFixed(2)
    })
  }
  
  if (text.includes('旅行社')) {
    const agencyMatch = text.match(/旅行社[^0-9]*(\d+)%/)
    const agencyPercent = agencyMatch ? parseInt(agencyMatch[1]) : 30
    items.push({
      name: '顺风旅行社',
      role: '旅行社',
      percent: agencyPercent,
      amount: (totalAmount * agencyPercent / 100).toFixed(2)
    })
  }
  
  if (text.includes('平台')) {
    const platformMatch = text.match(/平台[^0-9]*(\d+)%/)
    const platformPercent = platformMatch ? parseInt(platformMatch[1]) : 10
    items.push({
      name: '平台服务费',
      role: '平台',
      percent: platformPercent,
      amount: (totalAmount * platformPercent / 100).toFixed(2)
    })
  }
  
  // 如果没有识别到任何分账对象，使用默认模板
  if (items.length === 0) {
    items.push(
      { name: '李四(导游)', role: '导游', percent: 50, amount: (totalAmount * 0.5).toFixed(2) },
      { name: '顺风旅行社', role: '旅行社', percent: 50, amount: (totalAmount * 0.5).toFixed(2) }
    )
  }
  
  return {
    type: 'split',
    items,
    totalAmount: totalAmount.toFixed(2),
    confidence: 85
  }
}

// 使用快捷模板
const useQuickTemplate = (key) => {
  const tpl = quickTemplates[key]
  if (key === 'custom') {
    messages.value.push({
      role: 'assistant',
      content: '请描述您的分账需求，例如：\n• 把10000元按3:7分给导游和旅行社\n• 导游李四分60%，司机张三分40%，共5000元'
    })
  } else {
    inputText.value = tpl.prompt
    sendMessage()
  }
}

// 使用推荐模板
const useTemplate = (tpl) => {
  inputText.value = `使用模板：${tpl.name}，${tpl.description}`
  sendMessage()
}

// 确认分账
const confirmSplit = (msg) => {
  confirmItems.value = msg.splitItems
  showConfirmPopup.value = true
}

// 编辑分账
const editSplit = (msg) => {
  messages.value.push({
    role: 'assistant',
    content: '请告诉我需要调整的内容，例如：\n• 导游改成50%\n• 增加一个分账对象：王五 10%'
  })
}

// 执行分账
const executeSplit = async () => {
  executing.value = true
  
  try {
    // 调用分账接口
    const totalAmount = confirmItems.value.reduce((sum, item) => sum + parseFloat(item.amount), 0)
    
    // 检查余额
    if (accountStore.currentAccount.balance < totalAmount) {
      uni.showToast({ title: '余额不足', icon: 'none' })
      executing.value = false
      return
    }
    
    // 模拟分账请求
    await new Promise(r => setTimeout(r, 1000))
    
    // 更新余额
    accountStore.updateBalance(accountStore.currentAccount.balance - totalAmount)
    
    showConfirmPopup.value = false
    executing.value = false
    
    messages.value.push({
      role: 'assistant',
      content: `✅ 分账成功！\n\n分账单号：SP${Date.now()}\n总金额：¥${totalAmount.toFixed(2)}\n\n分账明细已发送至各收款方。`
    })
    
    await scrollToBottom()
    
  } catch (e) {
    executing.value = false
    uni.showToast({ title: '分账失败，请重试', icon: 'none' })
  }
}

const confirmTotal = computed(() => {
  return confirmItems.value.reduce((sum, item) => sum + parseFloat(item.amount), 0).toFixed(2)
})

const scrollToBottom = async () => {
  await nextTick()
  // uniapp 滚动到底部
  uni.pageScrollTo({ scrollTop: 99999, duration: 300 })
}

const goBack = () => uni.navigateBack()
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.nav-back {
  font-size: 20px;
  padding: 4px 12px 4px 0;
}

.nav-title {
  font-size: 17px;
  font-weight: 600;
}

.chat-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  
  &.user {
    flex-direction: row-reverse;
    
    .message-content {
      background: $primary-color;
      color: #fff;
      border-radius: 16px 16px 4px 16px;
    }
  }
  
  &.assistant {
    .message-content {
      background: #fff;
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
}

.message-content {
  max-width: 75%;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.6;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
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
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 8px;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-title {
  font-weight: 600;
  color: #333;
}

.result-confidence {
  font-size: 12px;
  color: $success-color;
  background: rgba($success-color, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.split-items {
  margin-bottom: 12px;
}

.split-item-preview {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  font-size: 13px;
  
  &:last-child {
    border-bottom: none;
  }
  
  .item-name { font-weight: 500; color: #333; }
  .item-role { color: #888; font-size: 12px; }
  .item-amount { color: $primary-color; font-weight: 600; text-align: right; }
  .item-percent { color: #888; text-align: right; }
}

.result-total {
  text-align: right;
  font-size: 14px;
  color: #333;
  padding-top: 8px;
  border-top: 1px dashed #eee;
}

.result-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.template-suggest {
  .suggest-title {
    font-weight: 600;
    margin-bottom: 12px;
  }
  
  .template-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .template-item {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    
    &:active {
      background: #e3f2fd;
    }
  }
  
  .tpl-name {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }
  
  .tpl-desc {
    font-size: 12px;
    color: #888;
  }
}

.quick-templates {
  padding: 16px;
  background: #fff;
  margin: 0 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.qt-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
}

.qt-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.qt-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  
  &:active {
    background: #e3f2fd;
  }
}

.qt-emoji {
  font-size: 20px;
}

.qt-text {
  font-size: 13px;
  color: #333;
}

.input-area {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.chat-input {
  flex: 1;
  height: 40px;
  padding: 0 16px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 14px;
}

.input-tips {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
}

.confirm-popup {
  padding: 20px;
}

.confirm-title {
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 20px;
}

.confirm-list {
  margin-bottom: 16px;
}

.confirm-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.ci-info {
  .ci-name {
    font-size: 15px;
    font-weight: 500;
    color: #333;
  }
  
  .ci-role {
    font-size: 12px;
    color: #888;
    margin-left: 8px;
  }
}

.ci-amount {
  font-size: 16px;
  font-weight: 600;
  color: $primary-color;
}

.confirm-total {
  display: flex;
  justify-content: space-between;
  padding: 16px 0;
  font-size: 15px;
  
  .total-amount {
    font-size: 20px;
    font-weight: 700;
    color: $primary-color;
  }
}

.confirm-actions {
  margin-top: 16px;
}
</style>
