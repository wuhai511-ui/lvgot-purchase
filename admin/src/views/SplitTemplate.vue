<template>
  <div class="page">
    <div class="page-title">📐 分账模板管理</div>
    
    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="showCreateDialog = true">+ 新建模板</el-button>
    </div>
    
    <!-- 模板列表 -->
    <div class="template-grid">
      <div 
        v-for="tpl in templates" 
        :key="tpl.template_id" 
        class="template-card"
        :class="{ 'system-template': tpl.is_system }"
      >
        <div class="card-header">
          <div class="tpl-icon">{{ tpl.icon || '📋' }}</div>
          <div class="tpl-info">
            <div class="tpl-name">{{ tpl.name }}</div>
            <div class="tpl-desc">{{ tpl.description || '暂无描述' }}</div>
          </div>
          <div class="tpl-badge" v-if="tpl.is_system">
            <el-tag size="small" type="info">系统模板</el-tag>
          </div>
        </div>
        
        <div class="card-body">
          <div class="split-preview">
            <div v-for="(item, i) in tpl.items" :key="i" class="preview-item">
              <div class="pi-info">
                <span class="pi-name">{{ item.name }}</span>
                <span class="pi-role">{{ item.role }}</span>
              </div>
              <div class="pi-right">
                <span class="pi-percent">{{ item.percent }}%</span>
                <div class="pi-bar">
                  <div class="pi-bar-fill" :style="{ width: item.percent + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <span class="usage-count">使用 {{ tpl.usage_count || 0 }} 次</span>
          <div class="card-actions">
            <el-button type="primary" size="small" @click="useTemplate(tpl)">使用</el-button>
            <el-button size="small" @click="editTemplate(tpl)" :disabled="tpl.is_system">编辑</el-button>
            <el-button type="danger" size="small" @click="deleteTemplate(tpl)" :disabled="tpl.is_system">删除</el-button>
          </div>
        </div>
      </div>
      
      <el-empty v-if="templates.length === 0" description="暂无分账模板" />
    </div>
    
    <!-- 创建/编辑弹窗 -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingTemplate ? '编辑模板' : '新建模板'" 
      width="600px"
    >
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称" required>
          <el-input v-model="form.name" placeholder="如：旅行团标准分账" />
        </el-form-item>
        
        <el-form-item label="模板描述">
          <el-input v-model="form.description" placeholder="简要描述模板用途" />
        </el-form-item>
        
        <el-form-item label="分账项目" required>
          <div class="items-editor">
            <div v-for="(item, index) in form.items" :key="index" class="item-row">
              <el-input v-model="item.name" placeholder="名称" style="width: 120px" />
              <el-input v-model="item.role" placeholder="角色" style="width: 100px" />
              <el-input-number v-model="item.percent" :min="0" :max="100" placeholder="%" style="width: 120px" />
              <el-button type="danger" :icon="Delete" circle @click="removeItem(index)" :disabled="form.items.length <= 1" />
            </div>
            
            <el-button type="primary" link @click="addItem">
              <el-icon><Plus /></el-icon> 添加分账项
            </el-button>
            
            <div class="percent-total" :class="{ error: formPercentTotal !== 100 }">
              <span>合计：{{ formPercentTotal }}%</span>
              <span v-if="formPercentTotal !== 100">（需等于100%）</span>
              <span v-else class="success">✓</span>
            </div>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="closeCreateDialog">取消</el-button>
        <el-button type="primary" @click="saveTemplate" :disabled="!canSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import axios from 'axios'

const templates = ref([])
const showCreateDialog = ref(false)
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

// 加载模板列表
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

// 添加分账项
const addItem = () => {
  form.value.items.push({ name: '', role: '', percent: 0 })
}

// 移除分账项
const removeItem = (index) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

// 编辑模板
const editTemplate = (tpl) => {
  editingTemplate.value = tpl
  form.value = {
    name: tpl.name,
    description: tpl.description || '',
    items: JSON.parse(JSON.stringify(tpl.items))
  }
  showCreateDialog.value = true
}

// 删除模板
const deleteTemplate = async (tpl) => {
  try {
    await ElMessageBox.confirm(`确定要删除模板"${tpl.name}"吗？`, '确认删除', {
      type: 'warning'
    })
    
    const res = await axios.delete(`/api/split-templates/${tpl.template_id}`)
    
    if (res.data.code === 0) {
      ElMessage.success('删除成功')
      loadTemplates()
    } else {
      ElMessage.error(res.data.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 使用模板
const useTemplate = async (tpl) => {
  try {
    await axios.post(`/api/split-templates/${tpl.template_id}/use`)
    
    // 跳转到 AI 分账页面
    ElMessage.success('模板已应用，请前往 AI 分账页面操作')
  } catch (e) {
    console.error('使用模板失败:', e)
  }
}

// 保存模板
const saveTemplate = async () => {
  if (!canSave.value) return
  
  try {
    let res
    if (editingTemplate.value) {
      res = await axios.put(`/api/split-templates/${editingTemplate.value.template_id}`, form.value)
    } else {
      res = await axios.post('/api/split-templates', form.value)
    }
    
    if (res.data.code === 0) {
      ElMessage.success(editingTemplate.value ? '更新成功' : '创建成功')
      closeCreateDialog()
      loadTemplates()
    } else {
      ElMessage.error(res.data.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const closeCreateDialog = () => {
  showCreateDialog.value = false
  editingTemplate.value = null
  form.value = {
    name: '',
    description: '',
    items: [{ name: '', role: '', percent: 0 }]
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }

.action-bar {
  margin-bottom: 20px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.template-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  overflow: hidden;
  transition: all 0.2s;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  &.system-template {
    border: 1px solid #e3f2fd;
    background: linear-gradient(to bottom, #f5f9ff, #fff);
  }
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
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
  flex-shrink: 0;
}

.tpl-info {
  flex: 1;
}

.tpl-name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.tpl-desc {
  font-size: 13px;
  color: #888;
}

.tpl-badge {
  flex-shrink: 0;
}

.card-body {
  padding: 16px;
}

.split-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pi-info {
  display: flex;
  gap: 8px;
}

.pi-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.pi-role {
  font-size: 12px;
  color: #888;
}

.pi-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pi-percent {
  font-size: 14px;
  font-weight: 600;
  color: #1976D2;
  width: 50px;
  text-align: right;
}

.pi-bar {
  width: 80px;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.pi-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976D2, #42a5f5);
  border-radius: 3px;
  transition: width 0.3s;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.usage-count {
  font-size: 12px;
  color: #888;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.items-editor {
  width: 100%;
}

.item-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.percent-total {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 14px;
  
  &.error {
    background: #fff3e0;
    color: #f56c6c;
  }
  
  .success {
    color: #67c23a;
    margin-left: 8px;
  }
}
</style>
