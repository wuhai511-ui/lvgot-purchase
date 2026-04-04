<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">📐 分账模板</text>
      <text class="nav-action" @click="showCreatePopup = true">+ 新建</text>
    </view>

    <!-- 模板列表 -->
    <view class="template-list">
      <view 
        v-for="(tpl, index) in templates" 
        :key="tpl.id" 
        class="template-card"
        @click="useTemplate(tpl)"
      >
        <view class="tpl-header">
          <view class="tpl-icon">{{ tpl.icon || '📋' }}</view>
          <view class="tpl-info">
            <view class="tpl-name">{{ tpl.name }}</view>
            <view class="tpl-desc">{{ tpl.description }}</view>
          </view>
          <view class="tpl-actions" @click.stop>
            <text class="action-btn" @click="editTemplate(tpl)">编辑</text>
            <text class="action-btn danger" @click="deleteTemplate(tpl, index)">删除</text>
          </view>
        </view>
        
        <view class="tpl-preview">
          <view v-for="(item, i) in tpl.items" :key="i" class="preview-item">
            <view class="pi-name">{{ item.name }}</view>
            <view class="pi-percent">{{ item.percent }}%</view>
            <view class="pi-bar">
              <view class="pi-bar-fill" :style="{ width: item.percent + '%' }"></view>
            </view>
          </view>
        </view>
        
        <view class="tpl-footer">
          <text class="tpl-usage">使用 {{ tpl.usageCount || 0 }} 次</text>
          <text class="tpl-time">{{ tpl.updateTime }}</text>
        </view>
      </view>
      
      <view v-if="templates.length === 0" class="empty-state">
        <view class="empty-icon">📝</view>
        <view class="empty-text">暂无分账模板</view>
        <view class="empty-desc">点击右上角"新建"创建您的第一个分账模板</view>
      </view>
    </view>

    <!-- 系统推荐模板 -->
    <view class="section" v-if="systemTemplates.length > 0">
      <view class="section-title">💡 推荐模板</view>
      <view class="system-templates">
        <view 
          v-for="(tpl, index) in systemTemplates" 
          :key="'sys-' + index" 
          class="sys-tpl-card"
          @click="adoptTemplate(tpl)"
        >
          <view class="sys-tpl-icon">{{ tpl.icon }}</view>
          <view class="sys-tpl-info">
            <view class="sys-tpl-name">{{ tpl.name }}</view>
            <view class="sys-tpl-desc">{{ tpl.description }}</view>
          </view>
          <text class="sys-tpl-adopt">采用</text>
        </view>
      </view>
    </view>

    <!-- 创建/编辑模板弹窗 -->
    <van-popup v-model:show="showCreatePopup" position="bottom" round :style="{ height: '80%' }">
      <view class="create-popup">
        <view class="popup-header">
          <text class="popup-title">{{ editingTemplate ? '编辑模板' : '新建模板' }}</text>
          <text class="popup-close" @click="closeCreatePopup">×</text>
        </view>
        
        <view class="popup-body">
          <view class="form-item">
            <view class="form-label">模板名称</view>
            <input class="form-input" v-model="form.name" placeholder="如：旅行团标准分账" />
          </view>
          
          <view class="form-item">
            <view class="form-label">模板描述</view>
            <input class="form-input" v-model="form.description" placeholder="简要描述模板用途" />
          </view>
          
          <view class="form-item">
            <view class="form-label">
              <text>分账项目</text>
              <text class="add-btn" @click="addItem">+ 添加</text>
            </view>
            
            <view class="items-list">
              <view v-for="(item, index) in form.items" :key="index" class="item-row">
                <input class="item-name" v-model="item.name" placeholder="名称" />
                <input class="item-role" v-model="item.role" placeholder="角色" />
                <input class="item-percent" v-model.number="item.percent" type="number" placeholder="%" />
                <text class="item-delete" @click="removeItem(index)">×</text>
              </view>
            </view>
            
            <view class="percent-total" :class="{ error: formPercentTotal !== 100 }">
              <text>合计：{{ formPercentTotal }}%</text>
              <text v-if="formPercentTotal !== 100">（需等于100%）</text>
            </view>
          </view>
        </view>
        
        <view class="popup-footer">
          <van-button block type="primary" round @click="saveTemplate" :disabled="!canSave">
            {{ editingTemplate ? '保存修改' : '创建模板' }}
          </van-button>
        </view>
      </view>
    </van-popup>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const templates = ref([])
const systemTemplates = ref([
  {
    id: 'sys-1',
    name: '旅行团标准分账',
    icon: '🎒',
    description: '适用于常规旅行团消费分账',
    items: [
      { name: '旅行社', role: '旅行社', percent: 30 },
      { name: '导游', role: '导游', percent: 40 },
      { name: '司机', role: '司机', percent: 20 },
      { name: '平台服务费', role: '平台', percent: 10 }
    ]
  },
  {
    id: 'sys-2',
    name: '商店返佣分账',
    icon: '🏪',
    description: '适用于旅游商店返佣结算',
    items: [
      { name: '旅行社', role: '旅行社', percent: 50 },
      { name: '导游', role: '导游', percent: 35 },
      { name: '平台服务费', role: '平台', percent: 15 }
    ]
  },
  {
    id: 'sys-3',
    name: '导游司机平分',
    icon: '👥',
    description: '导游司机各占一半',
    items: [
      { name: '导游', role: '导游', percent: 50 },
      { name: '司机', role: '司机', percent: 50 }
    ]
  }
])

const showCreatePopup = ref(false)
const editingTemplate = ref(null)

const form = ref({
  name: '',
  description: '',
  items: [
    { name: '', role: '', percent: 0 }
  ]
})

const formPercentTotal = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (item.percent || 0), 0)
})

const canSave = computed(() => {
  return form.value.name && 
         form.value.items.length > 0 && 
         form.value.items.every(item => item.name && item.percent > 0) &&
         formPercentTotal.value === 100
})

const addItem = () => {
  form.value.items.push({ name: '', role: '', percent: 0 })
}

const removeItem = (index) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

const editTemplate = (tpl) => {
  editingTemplate.value = tpl
  form.value = {
    name: tpl.name,
    description: tpl.description || '',
    items: JSON.parse(JSON.stringify(tpl.items))
  }
  showCreatePopup.value = true
}

const deleteTemplate = (tpl, index) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除模板"${tpl.name}"吗？`,
    success: (res) => {
      if (res.confirm) {
        templates.value.splice(index, 1)
        saveTemplates()
        uni.showToast({ title: '已删除', icon: 'success' })
      }
    }
  })
}

const useTemplate = (tpl) => {
  // 跳转到分账页面并带上模板数据
  uni.navigateTo({
    url: `/pages/split/index?templateId=${tpl.id}`
  })
}

const adoptTemplate = (tpl) => {
  // 采用系统模板
  form.value = {
    name: tpl.name,
    description: tpl.description,
    items: JSON.parse(JSON.stringify(tpl.items))
  }
  editingTemplate.value = null
  showCreatePopup.value = true
}

const saveTemplate = () => {
  if (!canSave.value) return
  
  const now = new Date().toLocaleDateString()
  
  if (editingTemplate.value) {
    // 编辑模式
    Object.assign(editingTemplate.value, {
      name: form.value.name,
      description: form.value.description,
      items: JSON.parse(JSON.stringify(form.value.items)),
      updateTime: now
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
  } else {
    // 新建模式
    templates.value.push({
      id: 'tpl-' + Date.now(),
      name: form.value.name,
      description: form.value.description,
      icon: '📋',
      items: JSON.parse(JSON.stringify(form.value.items)),
      usageCount: 0,
      updateTime: now,
      createTime: now
    })
    uni.showToast({ title: '创建成功', icon: 'success' })
  }
  
  saveTemplates()
  closeCreatePopup()
}

const closeCreatePopup = () => {
  showCreatePopup.value = false
  editingTemplate.value = null
  form.value = {
    name: '',
    description: '',
    items: [{ name: '', role: '', percent: 0 }]
  }
}

const saveTemplates = () => {
  // 保存到本地存储
  uni.setStorageSync('split_templates', JSON.stringify(templates.value))
}

const loadTemplates = () => {
  // 从本地存储加载
  const saved = uni.getStorageSync('split_templates')
  if (saved) {
    templates.value = JSON.parse(saved)
  }
}

const goBack = () => uni.navigateBack()

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
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

.nav-action {
  font-size: 14px;
  color: $primary-color;
}

.template-list {
  padding: 16px;
}

.template-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.tpl-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.tpl-icon {
  width: 40px;
  height: 40px;
  background: #f5f5f5;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.tpl-info {
  flex: 1;
}

.tpl-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.tpl-desc {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.tpl-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  font-size: 13px;
  color: $primary-color;
  
  &.danger {
    color: #f56c6c;
  }
}

.tpl-preview {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.preview-item {
  display: grid;
  grid-template-columns: 80px 40px 1fr;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.pi-name {
  font-size: 13px;
  color: #333;
}

.pi-percent {
  font-size: 13px;
  color: $primary-color;
  font-weight: 600;
  text-align: right;
}

.pi-bar {
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.pi-bar-fill {
  height: 100%;
  background: $primary-gradient;
  border-radius: 3px;
  transition: width 0.3s;
}

.tpl-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #aaa;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 13px;
  color: #888;
}

.section {
  padding: 0 16px 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.system-templates {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sys-tpl-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.sys-tpl-icon {
  width: 36px;
  height: 36px;
  background: #f5f5f5;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.sys-tpl-info {
  flex: 1;
}

.sys-tpl-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.sys-tpl-desc {
  font-size: 12px;
  color: #888;
  margin-top: 2px;
}

.sys-tpl-adopt {
  font-size: 13px;
  color: $primary-color;
  padding: 4px 12px;
  border: 1px solid $primary-color;
  border-radius: 14px;
}

.create-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.popup-title {
  font-size: 17px;
  font-weight: 600;
}

.popup-close {
  font-size: 24px;
  color: #888;
  padding: 0 8px;
}

.popup-body {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.form-item {
  margin-bottom: 20px;
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.add-btn {
  font-size: 13px;
  color: $primary-color;
  font-weight: normal;
}

.form-input {
  width: 100%;
  height: 44px;
  padding: 0 14px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 14px;
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-row {
  display: grid;
  grid-template-columns: 1fr 80px 60px 32px;
  gap: 8px;
  align-items: center;
}

.item-name, .item-role, .item-percent {
  height: 36px;
  padding: 0 10px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 13px;
}

.item-delete {
  font-size: 18px;
  color: #f56c6c;
  text-align: center;
}

.percent-total {
  margin-top: 12px;
  font-size: 13px;
  color: #888;
  
  &.error {
    color: #f56c6c;
  }
}

.popup-footer {
  padding: 16px;
  border-top: 1px solid #eee;
}
</style>
