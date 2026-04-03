<template>
  <div class="page">
    <div class="page-title">🎒 旅行团管理</div>

    <!-- 搜索和操作区 -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-body" style="display:flex;justify-content:space-between;align-items:center;">
        <div class="search-area">
          <el-input v-model="searchText" placeholder="搜索旅行团名称/编号" style="width:200px;margin-right:12px;" clearable @keyup.enter="loadData"/>
          <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="margin-right:12px;" value-format="YYYY-MM-DD"/>
          <el-select v-model="statusFilter" placeholder="状态" style="width:120px;margin-right:12px;" clearable>
            <el-option label="全部" value=""/>
            <el-option label="进行中" value="ACTIVE"/>
            <el-option label="已结束" value="FINISHED"/>
            <el-option label="已取消" value="CANCELLED"/>
          </el-select>
          <el-button type="primary" @click="loadData">查询</el-button>
        </div>
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon> 新增旅行团
        </el-button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="card">
      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="tour_no" label="旅行团编号" width="150"/>
        <el-table-column prop="tour_name" label="旅行团名称" min-width="180"/>
        <el-table-column prop="route_name" label="旅行线路" width="150"/>
        <el-table-column label="行程日期" width="200">
          <template #default="{row}">
            {{ row.start_date }} 至 {{ row.end_date }}
          </template>
        </el-table-column>
        <el-table-column prop="guide_name" label="导游" width="100"/>
        <el-table-column prop="driver_name" label="司机" width="100"/>
        <el-table-column prop="shop_name" label="购物商店" width="150"/>
        <el-table-column prop="total_amount" label="总金额" width="120">
          <template #default="{row}">
            ¥{{ parseFloat(row.total_amount || 0).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="分账状态" width="100">
          <template #default="{row}">
            <el-tag :type="row.split_status === 'SUCCESS' ? 'success' : row.split_status === 'PENDING' ? 'warning' : 'info'" size="small">
              {{ row.split_status === 'SUCCESS' ? '已分账' : row.split_status === 'PENDING' ? '待分账' : '无需分账' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{row}">
            <el-tag :type="row.status === 'ACTIVE' ? 'success' : row.status === 'FINISHED' ? 'info' : 'danger'" size="small">
              {{ row.status === 'ACTIVE' ? '进行中' : row.status === 'FINISHED' ? '已结束' : '已取消' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click="handleView(row)">详情</el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="padding:16px;display:flex;justify-content:flex-end;">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="showDialog" :title="editingId ? '编辑旅行团' : '新增旅行团'" width="900px" :close-on-click-modal="false">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="旅行团名称" prop="tour_name">
              <el-input v-model="form.tour_name" placeholder="请输入旅行团名称"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="旅行团编号" prop="tour_no">
              <el-input v-model="form.tour_no" placeholder="自动生成" :disabled="true"/>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">旅行线路信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="旅行线路" prop="route_name">
              <el-input v-model="form.route_name" placeholder="请输入旅行线路名称"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="行程天数" prop="days">
              <el-input-number v-model="form.days" :min="1" :max="30" style="width:100%"/>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">行程安排</el-divider>
        <el-form-item label="行程详情" prop="itinerary">
          <el-input v-model="form.itinerary" type="textarea" :rows="4" placeholder="请输入行程安排详情"/>
        </el-form-item>

        <el-divider content-position="left">日期与人员</el-divider>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="开始日期" prop="start_date">
              <el-date-picker v-model="form.start_date" type="date" placeholder="选择开始日期" style="width:100%" value-format="YYYY-MM-DD"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="结束日期" prop="end_date">
              <el-date-picker v-model="form.end_date" type="date" placeholder="选择结束日期" style="width:100%" value-format="YYYY-MM-DD"/>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="人数" prop="people_count">
              <el-input-number v-model="form.people_count" :min="1" style="width:100%"/>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="导游" prop="guide_id">
              <el-select v-model="form.guide_id" placeholder="选择导游" filterable style="width:100%">
                <el-option v-for="g in guideList" :key="g.id" :label="g.register_name || g.legal_name" :value="g.id"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="司机" prop="driver_id">
              <el-select v-model="form.driver_id" placeholder="选择司机" filterable style="width:100%">
                <el-option v-for="d in driverList" :key="d.id" :label="d.register_name || d.legal_name" :value="d.id"/>
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">购物商店与景点</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="购物商店" prop="shop_id">
              <el-select v-model="form.shop_id" placeholder="选择购物商店" filterable style="width:100%">
                <el-option v-for="s in shopList" :key="s.id" :label="s.register_name" :value="s.id"/>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="景点" prop="attractions">
              <el-input v-model="form.attractions" placeholder="多个景点用逗号分隔"/>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">酒店信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="酒店名称" prop="hotel_name">
              <el-input v-model="form.hotel_name" placeholder="请输入酒店名称"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="酒店电话" prop="hotel_phone">
              <el-input v-model="form.hotel_phone" placeholder="请输入酒店电话"/>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="酒店地址" prop="hotel_address">
              <el-input v-model="form.hotel_address" placeholder="请输入酒店地址"/>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">费用信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="总金额" prop="total_amount">
              <el-input-number v-model="form.total_amount" :min="0" :precision="2" style="width:100%"/>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备注" prop="remark">
              <el-input v-model="form.remark" placeholder="备注信息"/>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="showDetail" title="旅行团详情" width="800px">
      <el-descriptions :column="2" border v-if="currentTour">
        <el-descriptions-item label="旅行团编号">{{ currentTour.tour_no }}</el-descriptions-item>
        <el-descriptions-item label="旅行团名称">{{ currentTour.tour_name }}</el-descriptions-item>
        <el-descriptions-item label="旅行线路">{{ currentTour.route_name }}</el-descriptions-item>
        <el-descriptions-item label="行程天数">{{ currentTour.days }}天</el-descriptions-item>
        <el-descriptions-item label="开始日期">{{ currentTour.start_date }}</el-descriptions-item>
        <el-descriptions-item label="结束日期">{{ currentTour.end_date }}</el-descriptions-item>
        <el-descriptions-item label="人数">{{ currentTour.people_count }}人</el-descriptions-item>
        <el-descriptions-item label="总金额">¥{{ parseFloat(currentTour.total_amount || 0).toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="导游">{{ currentTour.guide_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="司机">{{ currentTour.driver_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="购物商店">{{ currentTour.shop_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="景点">{{ currentTour.attractions || '-' }}</el-descriptions-item>
        <el-descriptions-item label="酒店名称">{{ currentTour.hotel_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="酒店电话">{{ currentTour.hotel_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="酒店地址" :span="2">{{ currentTour.hotel_address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="行程详情" :span="2">{{ currentTour.itinerary || '-' }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ currentTour.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { post } from '@/api/request.js'

// 简单的请求封装
const request = {
  get: (url, params) => {
    const query = new URLSearchParams(params).toString()
    return fetch(`${url}?${query}`).then(r => r.json())
  },
  post: (url, data) => post(url, data),
  put: (url, data) => {
    return fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(r => r.json())
  },
  delete: (url) => {
    return fetch(url, { method: 'DELETE' }).then(r => r.json())
  }
}

const loading = ref(false)
const tableData = ref([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchText = ref('')
const dateRange = ref([])
const statusFilter = ref('')

const showDialog = ref(false)
const showDetail = ref(false)
const editingId = ref(null)
const submitting = ref(false)
const formRef = ref()
const currentTour = ref(null)

// 人员列表
const guideList = ref([])
const driverList = ref([])
const shopList = ref([])

const form = reactive({
  tour_no: '',
  tour_name: '',
  route_name: '',
  days: 1,
  itinerary: '',
  start_date: '',
  end_date: '',
  people_count: 1,
  guide_id: '',
  driver_id: '',
  shop_id: '',
  attractions: '',
  hotel_name: '',
  hotel_phone: '',
  hotel_address: '',
  total_amount: 0,
  remark: ''
})

const rules = {
  tour_name: [{ required: true, message: '请输入旅行团名称', trigger: 'blur' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }]
}

// 生成旅行团编号
const generateTourNo = () => {
  const now = new Date()
  const dateStr = now.toISOString().slice(0,10).replace(/-/g,'')
  const random = Math.random().toString(36).substr(2, 6).toUpperCase()
  return `TG${dateStr}${random}`
}

// 加载列表
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: page.value,
      page_size: pageSize.value,
      search: searchText.value,
      status: statusFilter.value
    }
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }
    const res = await request.get('/api/tour-groups', { params })
    tableData.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (e) {
    ElMessage.error('加载失败：' + e.message)
  } finally {
    loading.value = false
  }
}

// 加载人员列表
const loadMembers = async () => {
  try {
    // 加载导游列表
    const guideRes = await request.get('/api/merchants', { params: { split_role: 'guide', status: 'SUCCESS' } })
    guideList.value = guideRes.data?.list || guideRes.data || []
    
    // 加载司机列表
    const driverRes = await request.get('/api/merchants', { params: { split_role: 'driver', status: 'SUCCESS' } })
    driverList.value = driverRes.data?.list || driverRes.data || []
    
    // 加载购物商店列表
    const shopRes = await request.get('/api/merchants', { params: { split_role: 'shop', status: 'SUCCESS' } })
    shopList.value = shopRes.data?.list || shopRes.data || []
  } catch (e) {
    console.error('加载人员列表失败', e)
  }
}

// 新增
const handleAdd = () => {
  editingId.value = null
  Object.assign(form, {
    tour_no: generateTourNo(),
    tour_name: '',
    route_name: '',
    days: 1,
    itinerary: '',
    start_date: '',
    end_date: '',
    people_count: 1,
    guide_id: '',
    driver_id: '',
    shop_id: '',
    attractions: '',
    hotel_name: '',
    hotel_phone: '',
    hotel_address: '',
    total_amount: 0,
    remark: ''
  })
  showDialog.value = true
}

// 编辑
const handleEdit = (row) => {
  editingId.value = row.id
  Object.assign(form, {
    tour_no: row.tour_no,
    tour_name: row.tour_name,
    route_name: row.route_name,
    days: row.days || 1,
    itinerary: row.itinerary,
    start_date: row.start_date,
    end_date: row.end_date,
    people_count: row.people_count || 1,
    guide_id: row.guide_id,
    driver_id: row.driver_id,
    shop_id: row.shop_id,
    attractions: row.attractions,
    hotel_name: row.hotel_name,
    hotel_phone: row.hotel_phone,
    hotel_address: row.hotel_address,
    total_amount: row.total_amount || 0,
    remark: row.remark
  })
  showDialog.value = true
}

// 查看详情
const handleView = (row) => {
  currentTour.value = row
  showDetail.value = true
}

// 删除
const handleDelete = async (row) => {
  await ElMessageBox.confirm('确定删除该旅行团吗？', '提示', { type: 'warning' })
  try {
    await request.delete(`/api/tour-groups/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    ElMessage.error('删除失败：' + e.message)
  }
}

// 提交
const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (editingId.value) {
      await request.put(`/api/tour-groups/${editingId.value}`, form)
      ElMessage.success('修改成功')
    } else {
      await request.post('/api/tour-groups', form)
      ElMessage.success('新增成功')
    }
    showDialog.value = false
    loadData()
  } catch (e) {
    ElMessage.error('操作失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
  loadMembers()
})
</script>

<style scoped>
.search-area {
  display: flex;
  align-items: center;
}
</style>
