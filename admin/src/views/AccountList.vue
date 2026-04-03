<template>
  <div class="page">
    <div class="page-title">💰 账户列表</div>

    <!-- 搜索筛选 -->
    <div class="card">
      <div class="card-body search-bar">
        <el-input v-model="searchForm.keyword" placeholder="账户名称/编号/手机号" clearable style="width: 200px" @keyup.enter="handleSearch" />
        <el-select v-model="searchForm.status" placeholder="开户状态" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="待开户" value="PENDING" />
          <el-option label="开户中" value="PROCESSING" />
          <el-option label="已开户" value="ACTIVE" />
          <el-option label="开户失败" value="FAILED" />
        </el-select>
        <el-select v-model="searchForm.signStatus" placeholder="签约状态" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="待签约" value="PENDING" />
          <el-option label="已签约" value="SIGNED" />
          <el-option label="签约失败" value="FAILED" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <div class="flex-spacer"></div>
        <el-button type="primary" @click="goToOpening">
          <el-icon><Plus /></el-icon>
          申请开户
        </el-button>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="card">
      <div class="card-body">
        <el-table :data="accountList" v-loading="loading" stripe>
          <el-table-column prop="accountNo" label="账户编号" width="180" />
          <el-table-column prop="accountName" label="账户名称" width="150">
            <template #default="{ row }">
              <span class="account-name">{{ row.accountName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="alias" label="账户别名" width="120">
            <template #default="{ row }">{{ row.alias || '-' }}</template>
          </el-table-column>
          <el-table-column prop="mobile" label="绑定手机号" width="130" />
          <el-table-column prop="enterpriseType" label="入网类型" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.enterpriseType === '3' ? 'warning' : 'primary'">
                {{ enterpriseTypeMap[row.enterpriseType] || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="roleType" label="分账角色" width="100">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ roleTypeMap[row.roleType] || '其他' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="signStatus" label="签约状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="signStatusType[row.signStatus]">
                {{ signStatusMap[row.signStatus] || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="开户状态" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="statusType[row.status]">
                {{ statusMap[row.status] || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column prop="operator" label="操作人" width="100">
            <template #default="{ row }">{{ row.operator || '系统' }}</template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
              <el-button v-if="row.status === 'PENDING'" type="success" link size="small" @click="continueOpening(row)">
                继续开户
              </el-button>
              <el-button v-if="row.qztUrl" type="warning" link size="small" @click="openQztPage(row)">
                打开签约页
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="showDetail" title="账户详情" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="账户编号">{{ currentAccount.accountNo }}</el-descriptions-item>
        <el-descriptions-item label="账户名称">{{ currentAccount.accountName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="账户别名">{{ currentAccount.alias || '-' }}</el-descriptions-item>
        <el-descriptions-item label="绑定手机号">{{ currentAccount.mobile }}</el-descriptions-item>
        <el-descriptions-item label="入网类型">{{ enterpriseTypeMap[currentAccount.enterpriseType] || '-' }}</el-descriptions-item>
        <el-descriptions-item label="分账角色">{{ roleTypeMap[currentAccount.roleType] || '-' }}</el-descriptions-item>
        <el-descriptions-item label="签约状态">
          <el-tag size="small" :type="signStatusType[currentAccount.signStatus]">
            {{ signStatusMap[currentAccount.signStatus] || '-' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="开户状态">
          <el-tag size="small" :type="statusType[currentAccount.status]">
            {{ statusMap[currentAccount.status] || '-' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(currentAccount.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="操作人">{{ currentAccount.operator || '系统' }}</el-descriptions-item>
        <el-descriptions-item label="商户请求号" :span="2">{{ currentAccount.outRequestNo }}</el-descriptions-item>
        <el-descriptions-item label="钱账通账户号" :span="2">{{ currentAccount.qztAccountNo || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button v-if="currentAccount.qztUrl" type="primary" @click="openQztPage(currentAccount)">
          打开签约页
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getMerchantList } from '@/api/merchant'

const router = useRouter()

// 状态映射
const enterpriseTypeMap = {
  '1': '企业',
  '2': '个体户',
  '3': '个人'
}

const roleTypeMap = {
  'PLATFORM': '平台',
  'MERCHANT': '商户',
  'OTHER': '其他'
}

const signStatusMap = {
  'PENDING': '待签约',
  'SIGNED': '已签约',
  'FAILED': '签约失败'
}

const signStatusType = {
  'PENDING': 'warning',
  'SIGNED': 'success',
  'FAILED': 'danger'
}

const statusMap = {
  'PENDING': '待开户',
  'PROCESSING': '开户中',
  'ACTIVE': '已开户',
  'FAILED': '开户失败',
  'PERSONAL_PENDING': '待完善'
}

const statusType = {
  'PENDING': 'info',
  'PROCESSING': 'warning',
  'ACTIVE': 'success',
  'FAILED': 'danger',
  'PERSONAL_PENDING': 'warning'
}

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  signStatus: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 数据
const accountList = ref([])
const loading = ref(false)

// 详情弹窗
const showDetail = ref(false)
const currentAccount = ref({})

// 获取列表
const fetchList = async () => {
  loading.value = true
  try {
    const res = await getMerchantList({
      keyword: searchForm.keyword,
      status: searchForm.status,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    
    if (res.code === 0) {
      // 转换数据格式
      accountList.value = (res.data || []).map(item => ({
        id: item.id,
        accountNo: item.qzt_response?.account_no || `TEMP_${item.id}`,
        accountName: item.register_name,
        alias: '',
        mobile: item.legal_mobile,
        enterpriseType: item.enterprise_type,
        roleType: 'OTHER',
        signStatus: item.status === 'ACTIVE' ? 'SIGNED' : 'PENDING',
        status: item.status,
        createdAt: item.created_at,
        operator: '',
        outRequestNo: item.out_request_no,
        qztAccountNo: item.qzt_response?.account_no,
        qztUrl: item.qzt_response?.url
      }))
      pagination.total = accountList.value.length
    }
  } catch (e) {
    console.error('获取账户列表失败:', e)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

// 重置
const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.signStatus = ''
  handleSearch()
}

// 分页
const handleSizeChange = (size) => {
  pagination.pageSize = size
  fetchList()
}

const handlePageChange = (page) => {
  pagination.page = page
  fetchList()
}

// 跳转开户页
const goToOpening = () => {
  router.push('/account-opening')
}

// 查看详情
const viewDetail = (row) => {
  currentAccount.value = row
  showDetail.value = true
}

// 继续开户
const continueOpening = (row) => {
  if (row.qztUrl) {
    window.open(row.qztUrl, '_blank')
  } else {
    ElMessage.warning('暂无开户链接，请重新申请')
  }
}

// 打开钱账通页面
const openQztPage = (row) => {
  if (row.qztUrl) {
    window.open(row.qztUrl, '_blank')
  }
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 19)
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; color: #1a1a1a; }
.card-body { padding: 20px; }
.search-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.flex-spacer { flex: 1; }
.account-name { font-weight: 500; color: #1976D2; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
