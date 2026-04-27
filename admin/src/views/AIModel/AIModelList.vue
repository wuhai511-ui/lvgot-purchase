<!-- admin/src/views/AIModel/AIModelList.vue -->
<template>
  <div class="ai-model-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>AI 模型配置</span>
          <el-button type="primary" size="small" @click="handleCreate">新增模型</el-button>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="名称/模型ID" clearable />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="searchForm.model_type" placeholder="全部" clearable>
            <el-option label="对话" value="chat" />
            <el-option label="嵌入" value="embedding" />
            <el-option label="补全" value="completion" />
            <el-option label="视觉" value="vision" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="启用" value="ACTIVE" />
            <el-option label="禁用" value="DISABLED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="model_id" label="模型ID" width="200" />
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column prop="api_endpoint" label="接入地址" min-width="250" />
        <el-table-column prop="api_key" label="API Key" width="180">
          <template #default="{ row }">
            <el-tooltip content="编辑可查看完整 Key" placement="top">
              <span class="key-masked">{{ row.api_key }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="model_type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.model_type === 'chat'" type="primary">对话</el-tag>
            <el-tag v-else-if="row.model_type === 'embedding'" type="success">嵌入</el-tag>
            <el-tag v-else-if="row.model_type === 'completion'" type="warning">补全</el-tag>
            <el-tag v-else-if="row.model_type === 'vision'" type="info">视觉</el-tag>
            <el-tag v-else>{{ row.model_type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'ACTIVE'" type="success">启用</el-tag>
            <el-tag v-else type="danger">禁用</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑AI模型' : '新增AI模型'" width="550px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="模型ID" prop="model_id">
          <el-input v-model="form.model_id" placeholder="例如: gpt-4-turbo" />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如: GPT-4 Turbo" />
        </el-form-item>
        <el-form-item label="接入地址" prop="api_endpoint">
          <el-input v-model="form.api_endpoint" placeholder="例如: https://api.openai.com/v1" />
        </el-form-item>
        <el-form-item label="API Key" prop="api_key">
          <el-input v-model="form.api_key" type="password" show-password placeholder="留空则不修改" />
        </el-form-item>
        <el-form-item label="模型类型" prop="model_type">
          <el-select v-model="form.model_type" style="width: 100%">
            <el-option label="对话 (Chat)" value="chat" />
            <el-option label="嵌入 (Embedding)" value="embedding" />
            <el-option label="补全 (Completion)" value="completion" />
            <el-option label="视觉 (Vision)" value="vision" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-switch
            v-model="form.status_active"
            active-text="启用"
            inactive-text="禁用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getAIModels, getAIModelDetail, createAIModel, updateAIModel, deleteAIModel } from '@/api/aimodel'

const loading = ref(false)
const submitting = ref(false)
const tableData = ref([])
const searchForm = reactive({
  keyword: '',
  model_type: '',
  status: ''
})

const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = reactive({
  id: null,
  model_id: '',
  name: '',
  api_endpoint: '',
  api_key: '',
  model_type: 'chat',
  status_active: true
})

const rules = {
  model_id: [{ required: true, message: '请输入模型ID', trigger: 'blur' }],
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  api_endpoint: [{ required: true, message: '请输入接入地址', trigger: 'blur' }]
}

async function fetchData() {
  loading.value = true
  try {
    const res = await getAIModels({
      keyword: searchForm.keyword,
      model_type: searchForm.model_type,
      status: searchForm.status
    })
    if (res.code === 0) {
      tableData.value = res.data || []
    } else {
      ElMessage.error(res.message || '获取列表失败')
    }
  } catch (err) {
    console.error('获取AI模型列表失败:', err)
    ElMessage.error('获取AI模型列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  fetchData()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.model_type = ''
  searchForm.status = ''
  handleSearch()
}

function resetForm() {
  form.id = null
  form.model_id = ''
  form.name = ''
  form.api_endpoint = ''
  form.api_key = ''
  form.model_type = 'chat'
  form.status_active = true
}

function handleCreate() {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

async function handleEdit(row) {
  isEdit.value = true
  resetForm()
  try {
    const res = await getAIModelDetail(row.id)
    if (res.code === 0) {
      const d = res.data
      form.id = d.id
      form.model_id = d.model_id
      form.name = d.name
      form.api_endpoint = d.api_endpoint
      form.api_key = d.api_key || ''
      form.model_type = d.model_type
      form.status_active = d.status === 'ACTIVE'
    }
  } catch (err) {
    ElMessage.error('获取模型详情失败')
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const data = {
      model_id: form.model_id,
      name: form.name,
      api_endpoint: form.api_endpoint,
      model_type: form.model_type,
      status: form.status_active ? 'ACTIVE' : 'DISABLED'
    }
    if (form.api_key) {
      data.api_key = form.api_key
    }
    let res
    if (isEdit.value) {
      res = await updateAIModel(form.id, data)
    } else {
      res = await createAIModel(data)
    }
    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (err) {
    console.error('保存AI模型失败:', err)
    ElMessage.error('保存失败')
  } finally {
    submitting.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除模型「${row.name}」？`, '删除确认', {
      confirmButtonText: '确认删除',
      type: 'warning'
    })
    const res = await deleteAIModel(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchData()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (err) {
    if (err !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.ai-model-list {
  padding: 20px;
}
.search-form {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.key-masked {
  font-family: monospace;
  color: #999;
}
</style>
