<template>
  <div class="page">
    <div class="page-title">账户资料</div>
    <div class="page-subtitle">维护商户主体信息、查看开户状态，并在这里直接继续开户或补充资料。</div>

    <div class="card">
      <div class="card-body search-bar" style="max-width: 1464px; margin: 0 auto;">
        <el-input v-model="searchForm.keyword" placeholder="账户名称/编号/手机号" clearable style="width: 220px" @keyup.enter="handleSearch" />
        <el-select v-model="searchForm.payAccountStatus" placeholder="支付账户状态" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="待开户" value="PENDING" />
          <el-option label="处理中" value="PROCESSING" />
          <el-option label="已开户" value="ACTIVE" />
          <el-option label="开户失败" value="FAILED" />
        </el-select>
        <el-select v-model="searchForm.bankAccountStatus" placeholder="银行内部户状态" clearable style="width: 140px">
          <el-option label="全部" value="" />
          <el-option label="待开户" value="PENDING" />
          <el-option label="处理中" value="PROCESSING" />
          <el-option label="已开户" value="ACTIVE" />
          <el-option label="开户失败" value="FAILED" />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
        <div class="flex-spacer"></div>
        <el-button type="primary" plain @click="goToOpening">
          <el-icon><Plus /></el-icon>
          申请开户
        </el-button>
      </div>
    </div>

    <div class="card">
      <div class="card-body">
        <el-table :data="accountList" v-loading="loading" stripe>
          <el-table-column prop="accountNo" label="账户编号" width="180" />
          <el-table-column prop="accountName" label="账户名称" width="150">
            <template #default="{ row }">
              <span class="account-name">{{ row.accountName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="mobile" label="绑定手机号" width="130" />
          <el-table-column prop="enterpriseType" label="入网类型" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="row.enterpriseType === '3' ? 'warning' : 'primary'">
                {{ enterpriseTypeMap[row.enterpriseType] || '未知' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="splitRole" label="分账角色" width="90">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ splitRoleMap[row.splitRole] || '其他' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="支付账户" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="subStatusType[row.payAccountStatus]">
                {{ subStatusMap[row.payAccountStatus] || '待开户' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="银行内部户" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="subStatusType[row.bankAccountStatus]">
                {{ subStatusMap[row.bankAccountStatus] || '待开户' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="活体检测" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="faceStatusType[row.faceVerifyStatus]">
                {{ faceStatusMap[row.faceVerifyStatus] || '待检测' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="操作" width="320" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
              <el-button v-if="row.payAccountStatus === 'PENDING'" type="success" link size="small" @click="continueOpening(row)">
                继续开户
              </el-button>
              <el-button v-if="row.payAccountStatus === 'ACTIVE' && row.bankAccountStatus !== 'ACTIVE'" type="warning" link size="small" @click="openBankAccount(row)">
                开通银行户
              </el-button>
              <el-button v-if="row.bankAccountUrl" type="info" link size="small" @click="openBankAccountPage(row)">
                银行户签约
              </el-button>
              <el-button v-if="row.payAccountStatus === 'ACTIVE' && row.bankAccountStatus === 'ACTIVE'" type="success" link size="small" @click="goRecharge(row)">
                充值
              </el-button>
              <el-button v-if="row.payAccountStatus === 'ACTIVE' && row.bankAccountStatus === 'ACTIVE'" type="warning" link size="small" @click="goWithdraw(row)">
                提现
              </el-button>
            </template>
          </el-table-column>
        </el-table>

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

    <el-dialog v-model="showDetail" title="账户详情" width="700px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="账户编号">{{ currentAccount.accountNo }}</el-descriptions-item>
        <el-descriptions-item label="账户名称">{{ currentAccount.accountName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="绑定手机号">{{ currentAccount.mobile }}</el-descriptions-item>
        <el-descriptions-item label="入网类型">{{ enterpriseTypeMap[currentAccount.enterpriseType] || '-' }}</el-descriptions-item>
        <el-descriptions-item label="分账角色">{{ splitRoleMap[currentAccount.splitRole] || '-' }}</el-descriptions-item>
        <el-descriptions-item label="支付账户状态">
          <el-tag size="small" :type="subStatusType[currentAccount.payAccountStatus]">
            {{ subStatusMap[currentAccount.payAccountStatus] || '待开户' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="银行内部户状态">
          <el-tag size="small" :type="subStatusType[currentAccount.bankAccountStatus]">
            {{ subStatusMap[currentAccount.bankAccountStatus] || '待开户' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="活体检测状态">
          <el-tag size="small" :type="faceStatusType[currentAccount.faceVerifyStatus]">
            {{ faceStatusMap[currentAccount.faceVerifyStatus] || '待检测' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatTime(currentAccount.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="商户请求号">{{ currentAccount.outRequestNo }}</el-descriptions-item>
        <el-descriptions-item label="钱账通账户号" :span="2">{{ currentAccount.qztAccountNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="回调消息" :span="2">{{ currentAccount.callbackMessage || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="showDetail = false">关闭</el-button>
        <el-button v-if="currentAccount.payAccountStatus === 'ACTIVE' && currentAccount.bankAccountStatus !== 'ACTIVE'" type="warning" @click="openBankAccount(currentAccount); showDetail = false">
          开通银行内部户
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getMerchantList } from '@/api/merchant'
import { post } from '@/api/request'

const router = useRouter()

const enterpriseTypeMap = {
  '1': '企业',
  '2': '个体户',
  '3': '个人'
}

const splitRoleMap = {
  shop: '旅行商店',
  agency: '旅行社',
  guide: '导游',
  driver: '司机',
  other: '其他'
}

// 子状态映射 - 支付账户 / 银行内部户
const subStatusMap = {
  PENDING: '待开户',
  PROCESSING: '处理中',
  REVIEWING: '审核中',
  ACTIVE: '已开户',
  FAILED: '失败'
}

const subStatusType = {
  PENDING: 'info',
  PROCESSING: 'warning',
  REVIEWING: 'warning',
  ACTIVE: 'success',
  FAILED: 'danger'
}

// 活体检测状态映射
const faceStatusMap = {
  PENDING: '待检测',
  PROCESSING: '检测中',
  PASSED: '已通过',
  FAILED: '未通过'
}

const faceStatusType = {
  PENDING: 'info',
  PROCESSING: 'warning',
  PASSED: 'success',
  FAILED: 'danger'
}

// 保留旧版状态映射（兼容）
const statusMap = {
  PENDING: '待开户',
  PROCESSING: '开户中',
  ACTIVE: '已开户',
  FAILED: '开户失败',
  PERSONAL_PENDING: '待完善',
  ENTERPRISE_PENDING: '待签约'
}

const statusType = {
  PENDING: 'info',
  PROCESSING: 'warning',
  ACTIVE: 'success',
  FAILED: 'danger',
  PERSONAL_PENDING: 'warning',
  ENTERPRISE_PENDING: 'warning'
}

const searchForm = reactive({
  keyword: '',
  payAccountStatus: '',
  bankAccountStatus: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const accountList = ref([])
const loading = ref(false)
const showDetail = ref(false)
const currentAccount = ref({})

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getMerchantList({
      keyword: searchForm.keyword,
      status: searchForm.payAccountStatus, // 兼容后端参数名
      page: pagination.page,
      pageSize: pagination.pageSize
    })

    if (res.code === 0) {
      accountList.value = (res.data || []).map((item) => ({
        id: item.id,
        accountNo: item.qzt_account_no || item.qzt_response?.account_no || `TEMP_${item.id}`,
        accountName: item.register_name,
        mobile: item.legal_mobile,
        enterpriseType: item.enterprise_type,
        splitRole: item.split_role || 'other',
        // 分开的子状态
        payAccountStatus: item.pay_account_status || (item.status === 'ACTIVE' ? 'ACTIVE' : 'PENDING'),
        bankAccountStatus: item.bank_account_status || 'PENDING',
        faceVerifyStatus: item.face_verify_status || 'PENDING',
        bankAccountUrl: item.bank_account_url,
        // 兼容旧字段
        status: item.status,
        createdAt: item.created_at,
        outRequestNo: item.out_request_no,
        qztAccountNo: item.qzt_account_no,
        qztUrl: item.qzt_response?.url,
        callbackMessage: item.callback_message
      }))
      pagination.total = accountList.value.length
    }
  } catch (error) {
    console.error('获取账户列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchList()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.payAccountStatus = ''
  searchForm.bankAccountStatus = ''
  handleSearch()
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  fetchList()
}

const handlePageChange = (page) => {
  pagination.page = page
  fetchList()
}

const goToOpening = () => {
  router.push('/account-opening')
}

const viewDetail = (row) => {
  currentAccount.value = row
  showDetail.value = true
}

const continueOpening = (row) => {
  if (row.qztUrl) {
    window.open(row.qztUrl, '_blank')
    return
  }
  router.push('/account-opening')
  ElMessage.info('未找到原开户链接，已跳转到开户申请页重新发起。')
}

// 开通银行内部户
const openBankAccount = async (row) => {
  try {
    ElMessage.info('正在获取银行内部户开户链接...')
    const res = await post('/api/merchant/bank-account/open', {
      account_no: row.qztAccountNo || row.outRequestNo,
      merchant_id: row.id
    })

    if (res.code === 0 && res.data?.url) {
      ElMessage.success('已获取开户链接，请在新窗口完成开户')
      window.open(res.data.url, '_blank')
      // 刷新列表
      setTimeout(() => fetchList(), 2000)
    } else {
      ElMessage.error(res.message || '获取银行内部户开户链接失败')
    }
  } catch (error) {
    console.error('开通银行内部户失败:', error)
    ElMessage.error('开通银行内部户失败: ' + (error.response?.data?.message || error.message))
  }
}

// 打开银行内部户签约页面
const openBankAccountPage = (row) => {
  if (row.bankAccountUrl) {
    window.open(row.bankAccountUrl, '_blank')
  }
}

const goRecharge = (row) => {
  router.push({ path: '/recharge', query: { merchant_id: row.id } })
}

const goWithdraw = (row) => {
  router.push({ path: '/withdraw', query: { merchant_id: row.id } })
}

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
.page-title { font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 8px; }
.page-subtitle { margin-bottom: 18px; color: #58716b; line-height: 1.8; font-size: 14px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-body { padding: 20px; }
.search-bar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.flex-spacer { flex: 1; }
.account-name { font-weight: 500; color: #1976D2; }
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
