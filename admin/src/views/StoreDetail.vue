<template>
  <div class="page">
    <div class="page-title">
      <el-button text @click="goBack" style="margin-right:8px;">←</el-button>
      门店详情
    </div>

    <!-- 基础信息 -->
    <div class="card">
      <div class="card-header">基础信息</div>
      <div class="card-body">
        <el-descriptions :column="2" border v-if="store">
          <el-descriptions-item label="门店ID">{{ store.store_id }}</el-descriptions-item>
          <el-descriptions-item label="门店名称">{{ store.store_name }}</el-descriptions-item>
          <el-descriptions-item label="绑定账户">{{ store.qzt_account_no || store.account_no || '-' }}</el-descriptions-item>
          <el-descriptions-item label="商户名称">{{ store.merchant_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="store.status === 'ACTIVE' ? 'success' : 'danger'" size="small">
              {{ store.status === 'ACTIVE' ? '启用' : '停用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(store.created_at) }}</el-descriptions-item>
        </el-descriptions>
        <div v-else class="loading-text">加载中...</div>
      </div>
    </div>

    <!-- 终端信息 -->
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <span>终端信息</span>
        <el-button type="primary" size="small" @click="showAddTerminal = true">+ 新增终端</el-button>
      </div>
      <div class="card-body">
        <el-table :data="terminals" v-loading="loadingTerminals" stripe>
          <el-table-column prop="merchant_no" label="商户号" width="200"/>
          <el-table-column prop="terminal_no" label="终端号" width="180"/>
          <el-table-column prop="merchant_name" label="商户名称" min-width="160"/>
          <el-table-column prop="bind_status" label="状态" width="80">
            <template #default="{row}">
              <el-tag :type="row.bind_status === 'BOUND' ? 'success' : 'warning'" size="small">
                {{ row.bind_status === 'BOUND' ? '已绑定' : '未绑定' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="绑定时间" width="170">
            <template #default="{row}">{{ formatTime(row.created_at) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{row}">
              <el-button type="danger" link size="small" @click="handleDeleteTerminal(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 关联旅行团 -->
    <div class="card">
      <div class="card-header">关联旅行团</div>
      <div class="card-body">
        <el-table :data="tourGroups" v-loading="loadingTourGroups" stripe>
          <el-table-column prop="tour_no" label="团号" width="150"/>
          <el-table-column prop="tour_name" label="旅行团名称" min-width="180"/>
          <el-table-column prop="route_name" label="线路" width="150"/>
          <el-table-column label="行程日期" width="200">
            <template #default="{row}">{{ row.start_date }} ~ {{ row.end_date }}</template>
          </el-table-column>
          <el-table-column prop="guide_name" label="导游" width="100"/>
          <el-table-column label="状态" width="80">
            <template #default="{row}">
              <el-tag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                {{ row.status === 'ACTIVE' ? '进行中' : '已结束' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="tourGroups.length === 0 && !loadingTourGroups" style="text-align:center;padding:20px;color:#999;">
          暂未关联旅行团
        </div>
      </div>
    </div>

    <!-- 新增终端弹窗 -->
    <el-dialog v-model="showAddTerminal" title="新增终端" width="500px">
      <el-form :model="terminalForm" :rules="terminalRules" ref="terminalFormRef" label-width="100px">
        <el-form-item label="商户号" prop="merchant_no">
          <el-input v-model="terminalForm.merchant_no" placeholder="请输入拉卡拉商户号"/>
        </el-form-item>
        <el-form-item label="终端号" prop="terminal_no">
          <el-input v-model="terminalForm.terminal_no" placeholder="请输入终端号"/>
        </el-form-item>
        <el-form-item label="商户名称">
          <el-input v-model="terminalForm.merchant_name" placeholder="请输入商户名称"/>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddTerminal = false">取消</el-button>
        <el-button type="primary" :loading="addingTerminal" @click="handleAddTerminal">确认添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getStoreDetail, addTerminal, deleteTerminal } from '@/api/store'

const route = useRoute()
const router = useRouter()

const store = ref(null)
const terminals = ref([])
const tourGroups = ref([])
const loadingTerminals = ref(false)
const loadingTourGroups = ref(false)
const showAddTerminal = ref(false)
const addingTerminal = ref(false)
const terminalFormRef = ref()
const terminalForm = ref({ merchant_no: '', terminal_no: '', merchant_name: '' })

const terminalRules = {
  merchant_no: [{ required: true, message: '请输入商户号', trigger: 'blur' }],
  terminal_no: [{ required: true, message: '请输入终端号', trigger: 'blur' }]
}

const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const goBack = () => router.back()

const fetchDetail = async () => {
  try {
    const res = await getStoreDetail(route.params.id)
    if (res.code === 0) {
      store.value = res.data
      terminals.value = res.data?.terminals || []
      tourGroups.value = res.data?.tour_groups || []
    } else {
      ElMessage.error(res.message || '获取门店详情失败')
    }
  } catch (e) {
    ElMessage.error('获取门店详情失败: ' + e.message)
  }
}

const handleAddTerminal = async () => {
  await terminalFormRef.value?.validate()
  addingTerminal.value = true
  try {
    const res = await addTerminal(route.params.id, terminalForm.value)
    if (res.code === 0) {
      ElMessage.success('添加成功')
      showAddTerminal.value = false
      terminalForm.value = { merchant_no: '', terminal_no: '', merchant_name: '' }
      fetchDetail()
    } else {
      ElMessage.error(res.message || '添加失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '添加失败')
  } finally {
    addingTerminal.value = false
  }
}

const handleDeleteTerminal = async (row) => {
  try {
    const res = await deleteTerminal(row.id)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      fetchDetail()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '删除失败')
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }
.loading-text { text-align: center; padding: 20px; color: #999; }
</style>
