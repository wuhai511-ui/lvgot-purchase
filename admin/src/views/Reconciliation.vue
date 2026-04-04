<template>
  <div class="page">
    <div class="page-title">📊 对账管理</div>
    
    <!-- 对账概览 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value">{{ stats.totalTasks }}</div>
        <div class="stat-label">本月对账任务</div>
      </div>
      <div class="stat-card success">
        <div class="stat-value">{{ stats.matchRate }}%</div>
        <div class="stat-label">匹配率</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">¥{{ formatMoney(stats.differenceAmount) }}</div>
        <div class="stat-label">差异金额</div>
      </div>
      <div class="stat-card danger">
        <div class="stat-value">{{ stats.pendingDifferences }}</div>
        <div class="stat-label">待处理差异</div>
      </div>
    </div>
    
    <!-- 新建对账任务 -->
    <div class="card create-task-card">
      <div class="card-header">新建对账任务</div>
      <div class="card-body">
        <el-form :inline="true" :model="taskForm">
          <el-form-item label="对账类型">
            <el-select v-model="taskForm.taskType" style="width: 150px">
              <el-option label="交易对账" value="trade" />
              <el-option label="资金对账" value="fund" />
              <el-option label="日终对账" value="daily" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="taskForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 260px"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="createTask" :loading="creating">开始对账</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <!-- 对账任务列表 -->
    <div class="card">
      <div class="card-header">
        <span>对账任务列表</span>
        <el-button type="primary" link @click="loadTasks">刷新</el-button>
      </div>
      <div class="card-body">
        <el-table :data="tasks" v-loading="loading" stripe>
          <el-table-column prop="task_no" label="任务编号" width="180" />
          <el-table-column prop="task_type" label="类型" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="taskTypeColor[row.task_type]">
                {{ taskTypeMap[row.task_type] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="时间范围" width="200">
            <template #default="{row}">
              {{ row.date_range_start }} ~ {{ row.date_range_end }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag :type="statusColor[row.status]">{{ statusMap[row.status] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="匹配情况" width="150">
            <template #default="{row}">
              <span v-if="row.total_records">
                {{ row.matched_records }} / {{ row.total_records }}
                <span class="match-rate">({{ Math.round(row.matched_records / row.total_records * 100) }}%)</span>
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="difference_amount" label="差异金额" width="120">
            <template #default="{row}">
              <span v-if="row.difference_amount > 0" class="money danger">
                ¥{{ formatMoney(row.difference_amount) }}
              </span>
              <span v-else class="money success">¥0.00</span>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="170">
            <template #default="{row}">
              {{ formatTime(row.created_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{row}">
              <el-button type="primary" link @click="viewTaskDetail(row)">详情</el-button>
              <el-button type="primary" link @click="exportReport(row)" :disabled="row.status !== 'completed'">
                导出
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
    
    <!-- 任务详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="对账任务详情" width="900px">
      <div v-if="currentTask" class="task-detail">
        <div class="detail-header">
          <div class="detail-item">
            <span class="label">任务编号：</span>
            <span>{{ currentTask.task_no }}</span>
          </div>
          <div class="detail-item">
            <span class="label">对账类型：</span>
            <el-tag :type="taskTypeColor[currentTask.task_type]">{{ taskTypeMap[currentTask.task_type] }}</el-tag>
          </div>
          <div class="detail-item">
            <span class="label">状态：</span>
            <el-tag :type="statusColor[currentTask.status]">{{ statusMap[currentTask.status] }}</el-tag>
          </div>
        </div>
        
        <el-divider />
        
        <div class="detail-stats">
          <div class="detail-stat">
            <div class="value">{{ currentTask.total_records }}</div>
            <div class="label">总记录数</div>
          </div>
          <div class="detail-stat success">
            <div class="value">{{ currentTask.matched_records }}</div>
            <div class="label">匹配记录</div>
          </div>
          <div class="detail-stat danger">
            <div class="value">{{ currentTask.unmatched_records }}</div>
            <div class="label">不匹配记录</div>
          </div>
          <div class="detail-stat warning">
            <div class="value">¥{{ formatMoney(currentTask.difference_amount) }}</div>
            <div class="label">差异金额</div>
          </div>
        </div>
        
        <el-divider content-position="left">差异明细</el-divider>
        
        <el-table :data="taskDifferences" max-height="300">
          <el-table-column prop="difference_type" label="差异类型" width="150">
            <template #default="{row}">
              {{ diffTypeMap[row.difference_type] || row.difference_type }}
            </template>
          </el-table-column>
          <el-table-column prop="severity" label="严重程度" width="100">
            <template #default="{row}">
              <el-tag :type="severityColor[row.severity]" size="small">
                {{ severityMap[row.severity] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="suggested_action" label="建议操作" width="200" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag :type="diffStatusColor[row.status]" size="small">
                {{ diffStatusMap[row.status] }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{row}">
              <el-button 
                v-if="row.status === 'pending'" 
                type="primary" 
                size="small"
                @click="resolveDifference(row, 'resolve')"
              >
                解决
              </el-button>
              <el-button 
                v-if="row.status === 'pending'" 
                size="small"
                @click="resolveDifference(row, 'ignore')"
              >
                忽略
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const loading = ref(false)
const creating = ref(false)
const tasks = ref([])
const showDetailDialog = ref(false)
const currentTask = ref(null)
const taskDifferences = ref([])

const stats = reactive({
  totalTasks: 0,
  matchRate: 98.5,
  differenceAmount: 320,
  pendingDifferences: 3
})

const taskForm = reactive({
  taskType: 'trade',
  dateRange: []
})

const taskTypeMap = { trade: '交易对账', fund: '资金对账', daily: '日终对账' }
const taskTypeColor = { trade: 'primary', fund: 'success', daily: 'warning' }
const statusMap = { pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败' }
const statusColor = { pending: 'info', processing: 'warning', completed: 'success', failed: 'danger' }
const diffTypeMap = { missing_split: '缺少分账记录', amount_mismatch: '金额不一致', duplicate: '重复记录' }
const severityMap = { low: '低', medium: '中', high: '高' }
const severityColor = { low: 'info', medium: 'warning', high: 'danger' }
const diffStatusMap = { pending: '待处理', resolved: '已解决', ignored: '已忽略' }
const diffStatusColor = { pending: 'warning', resolved: 'success', ignored: 'info' }

const formatMoney = (amount) => {
  if (!amount) return '0.00'
  return parseFloat(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatTime = (time) => {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 19)
}

// 加载对账任务
const loadTasks = async () => {
  loading.value = true
  try {
    const res = await axios.get('/api/reconciliation/tasks')
    if (res.data.code === 0) {
      tasks.value = res.data.data || []
      
      // 更新统计
      const completed = tasks.value.filter(t => t.status === 'completed')
      stats.totalTasks = tasks.value.length
      stats.matchRate = completed.length > 0 
        ? Math.round(completed.reduce((sum, t) => sum + (t.matched_records / t.total_records * 100 || 0), 0) / completed.length)
        : 100
      stats.differenceAmount = completed.reduce((sum, t) => sum + (t.difference_amount || 0), 0)
    }
  } catch (e) {
    console.error('加载任务失败:', e)
  } finally {
    loading.value = false
  }
}

// 创建对账任务
const createTask = async () => {
  if (!taskForm.dateRange || taskForm.dateRange.length !== 2) {
    ElMessage.warning('请选择时间范围')
    return
  }
  
  creating.value = true
  try {
    const res = await axios.post('/api/reconciliation/tasks', {
      taskType: taskForm.taskType,
      dateRangeStart: taskForm.dateRange[0],
      dateRangeEnd: taskForm.dateRange[1]
    })
    
    if (res.data.code === 0) {
      ElMessage.success('对账任务已创建，正在后台执行')
      loadTasks()
    } else {
      ElMessage.error(res.data.message || '创建失败')
    }
  } catch (e) {
    ElMessage.error('创建任务失败')
  } finally {
    creating.value = false
  }
}

// 查看任务详情
const viewTaskDetail = async (task) => {
  try {
    const res = await axios.get(`/api/reconciliation/tasks/${task.task_no}`)
    if (res.data.code === 0) {
      currentTask.value = res.data.data
      taskDifferences.value = res.data.data.differences || []
      showDetailDialog.value = true
    }
  } catch (e) {
    ElMessage.error('获取详情失败')
  }
}

// 处理差异
const resolveDifference = async (diff, action) => {
  try {
    const res = await axios.put(`/api/reconciliation/differences/${diff.id}`, { action })
    if (res.data.code === 0) {
      ElMessage.success(action === 'resolve' ? '已标记为解决' : '已忽略')
      // 刷新详情
      if (currentTask.value) {
        viewTaskDetail(currentTask.value)
      }
    }
  } catch (e) {
    ElMessage.error('操作失败')
  }
}

// 导出报告
const exportReport = (task) => {
  ElMessage.info('报告导出功能开发中...')
}

onMounted(() => {
  loadTasks()
  
  // 设置默认日期范围（本月）
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  taskForm.dateRange = [
    firstDay.toISOString().split('T')[0],
    lastDay.toISOString().split('T')[0]
  ]
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  
  &.success { border-top: 3px solid #67c23a; }
  &.warning { border-top: 3px solid #e6a23c; }
  &.danger { border-top: 3px solid #f56c6c; }
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #888;
}

.card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  margin-bottom: 20px;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-body {
  padding: 20px;
}

.match-rate {
  font-size: 12px;
  color: #888;
  margin-left: 4px;
}

.money {
  font-weight: 600;
  
  &.success { color: #67c23a; }
  &.danger { color: #f56c6c; }
}

.task-detail {
  padding: 12px 0;
}

.detail-header {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .label {
    color: #888;
  }
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  text-align: center;
}

.detail-stat {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  
  &.success { background: #f0f9eb; }
  &.warning { background: #fdf6ec; }
  &.danger { background: #fef0f0; }
  
  .value {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    margin-bottom: 8px;
  }
  
  .label {
    font-size: 13px;
    color: #888;
  }
}
</style>
