<template>
  <div class="page">
    <div class="page-title">账户资金管理</div>

    <!-- 筛选条件 -->
    <div class="card filter-card">
      <div class="card-body">
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <el-form-item label="账户编号">
            <el-input v-model="filterForm.accountNo" placeholder="请输入账户编号" clearable style="width: 180px" />
          </el-form-item>
          <el-form-item label="账户名称">
            <el-input v-model="filterForm.accountName" placeholder="请输入账户名称" clearable style="width: 180px" />
          </el-form-item>
          <el-form-item label="入网类型">
            <el-select v-model="filterForm.enterpriseType" placeholder="全部" clearable style="width: 140px">
              <el-option label="企业" value="1" />
              <el-option label="个体户" value="2" />
              <el-option label="个人" value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="分账角色">
            <el-select v-model="filterForm.splitRole" placeholder="全部" clearable style="width: 140px">
              <el-option label="旅行商店" value="shop" />
              <el-option label="旅行社" value="agency" />
              <el-option label="导游" value="guide" />
              <el-option label="司机" value="driver" />
              <el-option label="其他" value="other" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="card">
      <div class="card-body" style="padding: 0;">
        <el-table
          :data="accountList"
          v-loading="loading"
          stripe
          row-key="id"
          @expand-change="handleExpandChange"
        >
          <!-- 展开列 -->
          <el-table-column type="expand" width="50">
            <template #default="{ row }">
              <div class="expand-content" v-if="expandedRow === row.id">
                <div class="expand-grid">
                  <!-- 左侧资金信息 -->
                  <div class="expand-section">
                    <div class="section-title">资金信息</div>
                    <div class="fund-info">
                      <div class="fund-row highlight">
                        <span class="fund-label">余额（元）</span>
                        <span class="fund-value">¥{{ row.balance?.toFixed(2) || '0.00' }}</span>
                        <el-button type="primary" link size="small" @click="viewBills(row)">查看账单</el-button>
                      </div>
                      <div class="fund-row">
                        <span class="fund-label">提现中（元）</span>
                        <span class="fund-value secondary">¥{{ row.withdrawing?.toFixed(2) || '0.00' }}</span>
                      </div>
                      <div class="fund-row">
                        <span class="fund-label">在途中（元）</span>
                        <span class="fund-value secondary">¥{{ row.inTransit?.toFixed(2) || '0.00' }}</span>
                      </div>
                      <div class="fund-row">
                        <span class="fund-label">待结算（元）</span>
                        <span class="fund-value secondary">¥{{ row.pendingSettle?.toFixed(2) || '0.00' }}</span>
                      </div>
                      <div class="fund-row highlight">
                        <span class="fund-label">可结算金额（元）</span>
                        <span class="fund-value">¥{{ row.settleable?.toFixed(2) || '0.00' }}</span>
                        <el-button type="primary" link size="small" @click="viewSettleRecords(row)">查看结算记录</el-button>
                      </div>
                    </div>
                  </div>

                  <!-- 右侧银行信息 -->
                  <div class="expand-section">
                    <div class="section-title">结算银行卡</div>
                    <div class="bank-info">
                      <div class="bank-row">
                        <span class="bank-label">银行户名</span>
                        <span class="bank-value">{{ row.bankCardName || '-' }}</span>
                      </div>
                      <div class="bank-row">
                        <span class="bank-label">银行账号</span>
                        <span class="bank-value">{{ row.bankCardNo || '-' }}</span>
                      </div>
                      <div class="bank-row">
                        <span class="bank-label">开户银行</span>
                        <span class="bank-value">{{ row.bankName || '-' }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </el-table-column>

          <!-- 数据列 -->
          <el-table-column prop="accountNo" label="账户编号" width="180" />
          <el-table-column prop="accountName" label="账户名称" width="150">
            <template #default="{ row }">
              <span class="account-name">{{ row.accountName || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="enterpriseType" label="入网类型" width="100">
            <template #default="{ row }">
              <el-tag size="small" :type="enterpriseTypeColor[row.enterpriseType]">
                {{ enterpriseTypeMap[row.enterpriseType] || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="splitRole" label="分账角色" width="100">
            <template #default="{ row }">
              <el-tag size="small" type="info">{{ splitRoleMap[row.splitRole] || '其他' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="balance" label="余额（元）" width="120" align="right">
            <template #default="{ row }">
              <span class="balance-amount">¥{{ row.balance?.toFixed(2) || '0.00' }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="withdrawPeriod" label="提现账期(天)" width="110" align="center">
            <template #default="{ row }">
              {{ row.withdrawPeriod || 1 }}
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="注册时间" width="170">
            <template #default="{ row }">
              {{ formatTime(row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="150">
            <template #default="{ row }">
              <span class="remark-text">{{ row.remark || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleWithdraw(row)">提现</el-button>
              <el-button type="warning" link size="small" @click="handleChangeBankCard(row)">变更结算卡</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="fetchAccountList"
            @current-change="fetchAccountList"
          />
        </div>
      </div>
    </div>

    <!-- 变更结算卡弹窗 -->
    <el-dialog v-model="showBankCardDialog" title="变更结算银行卡" width="500px">
      <el-form :model="bankCardForm" :rules="bankCardRules" ref="bankCardFormRef" label-width="100px">
        <el-form-item label="当前账户">
          <span>{{ currentAccount?.accountName }}</span>
        </el-form-item>
        <el-form-item label="银行户名" prop="bank_card_name">
          <el-input v-model="bankCardForm.bank_card_name" placeholder="请输入银行户名" />
        </el-form-item>
        <el-form-item label="开户银行" prop="bank_code">
          <el-select v-model="bankCardForm.bank_code" placeholder="请选择开户银行" filterable style="width: 100%">
            <el-option v-for="bank in bankList" :key="bank.code" :label="bank.name" :value="bank.code" />
          </el-select>
        </el-form-item>
        <el-form-item label="银行账号" prop="bank_card_no">
          <el-input v-model="bankCardForm.bank_card_no" placeholder="请输入银行账号" maxlength="19" />
        </el-form-item>
        <el-form-item label="开户省份" prop="bank_province">
          <el-input v-model="bankCardForm.bank_province" placeholder="请输入开户省份" />
        </el-form-item>
        <el-form-item label="开户城市" prop="bank_city">
          <el-input v-model="bankCardForm.bank_city" placeholder="请输入开户城市" />
        </el-form-item>
        <el-form-item label="开户支行" prop="bank_branch">
          <el-input v-model="bankCardForm.bank_branch" placeholder="请输入开户支行" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showBankCardDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitBankCard">确认变更</el-button>
      </template>
    </el-dialog>

    <!-- 提现弹窗 -->
    <el-dialog v-model="showWithdrawDialog" title="申请提现" width="450px">
      <el-form :model="withdrawForm" :rules="withdrawRules" ref="withdrawFormRef" label-width="100px">
        <el-form-item label="账户名称">
          <span>{{ currentAccount?.accountName }}</span>
        </el-form-item>
        <el-form-item label="可提现余额">
          <span class="highlight-amount">¥{{ currentAccount?.settleable?.toFixed(2) || '0.00' }}</span>
        </el-form-item>
        <el-form-item label="提现金额" prop="amount">
          <el-input v-model.number="withdrawForm.amount" placeholder="请输入提现金额" style="width: 200px">
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="收款银行卡">
          <span>{{ currentAccount?.bankName }} ({{ currentAccount?.bankCardNo }})</span>
        </el-form-item>
        <el-form-item label="提现备注">
          <el-input v-model="withdrawForm.remark" placeholder="选填" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showWithdrawDialog = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitWithdraw">确认提现</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getMerchantList } from '@/api/merchant'
import { getAccountBalance } from '@/api/account'
import { applyWithdraw } from '@/api/withdraw'
import { bindBankCard } from '@/api/bankCard'

const router = useRouter()

// 筛选表单
const filterForm = reactive({
  accountNo: '',
  accountName: '',
  enterpriseType: '',
  splitRole: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const loading = ref(false)
const accountList = ref([])
const expandedRow = ref(null)

// 字典映射
const enterpriseTypeMap = { '1': '企业', '2': '个体户', '3': '个人' }
const enterpriseTypeColor = { '1': 'primary', '2': 'warning', '3': 'success' }
const splitRoleMap = { shop: '旅行商店', agency: '旅行社', guide: '导游', driver: '司机', other: '其他' }

// 银行列表
const bankList = [
  { code: '01020000', name: '中国工商银行' },
  { code: '01030000', name: '中国农业银行' },
  { code: '01040000', name: '中国银行' },
  { code: '01050000', name: '中国建设银行' },
  { code: '03080000', name: '招商银行' },
  { code: '03030000', name: '光大银行' },
  { code: '03020000', name: '中信银行' },
  { code: '03050000', name: '民生银行' },
  { code: '03060000', name: '广发银行' },
  { code: '03070000', name: '平安银行' },
  { code: '03100000', name: '浦发银行' },
  { code: '03090000', name: '兴业银行' },
  { code: '04012900', name: '北京银行' },
  { code: '04031000', name: '上海银行' },
  { code: '04083300', name: '宁波银行' }
]

// 弹窗控制
const showBankCardDialog = ref(false)
const showWithdrawDialog = ref(false)
const submitting = ref(false)
const currentAccount = ref(null)
const bankCardFormRef = ref()
const withdrawFormRef = ref()

const bankCardForm = reactive({
  bank_card_name: '',
  bank_code: '',
  bank_card_no: '',
  bank_province: '',
  bank_city: '',
  bank_branch: ''
})

const withdrawForm = reactive({
  amount: null,
  remark: ''
})

const bankCardRules = {
  bank_card_name: [{ required: true, message: '请输入银行户名', trigger: 'blur' }],
  bank_code: [{ required: true, message: '请选择开户银行', trigger: 'change' }],
  bank_card_no: [{ required: true, message: '请输入银行账号', trigger: 'blur' }],
  bank_province: [{ required: true, message: '请输入开户省份', trigger: 'blur' }],
  bank_city: [{ required: true, message: '请输入开户城市', trigger: 'blur' }]
}

const withdrawRules = {
  amount: [{ required: true, message: '请输入提现金额', trigger: 'blur' }]
}

const formatTime = (time) => {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 19)
}

const maskBankCard = (cardNo) => {
  if (!cardNo || cardNo.length < 8) return cardNo || '-'
  return cardNo.substring(0, 4) + '********' + cardNo.substring(cardNo.length - 4)
}

const getBankNameByCode = (code) => {
  const bank = bankList.find(b => b.code === code)
  return bank?.name || code || '-'
}

const fetchAccountList = async () => {
  loading.value = true
  try {
    const res = await getMerchantList({
      status: 'ACTIVE',
      keyword: filterForm.accountNo || filterForm.accountName || undefined
    })

    if (res.code === 0) {
      let list = res.data || []

      // 前端筛选
      if (filterForm.enterpriseType) {
        list = list.filter(item => item.enterprise_type === filterForm.enterpriseType)
      }
      if (filterForm.splitRole) {
        list = list.filter(item => item.split_role === filterForm.splitRole)
      }

      // 获取每个账户的余额
      accountList.value = await Promise.all(list.map(async (item) => {
        let balance = 0
        try {
          const balanceRes = await getAccountBalance(item.id)
          if (balanceRes.code === 0) {
            balance = balanceRes.data?.balance || 0
          }
        } catch (e) {
          console.error('获取余额失败:', e)
        }

        return {
          id: item.id,
          accountNo: item.qzt_response?.account_no || `TEMP_${item.id}`,
          accountName: item.register_name,
          enterpriseType: item.enterprise_type,
          splitRole: item.split_role || 'other',
          balance: balance,
          settleable: balance,
          withdrawing: 0,
          inTransit: 0,
          pendingSettle: 0,
          withdrawPeriod: 1,
          createdAt: item.created_at,
          remark: item.remark || '',
          bankCardName: item.qzt_response?.bank_card_name || item.legal_name,
          bankCardNo: maskBankCard(item.qzt_response?.bank_card_no),
          bankName: getBankNameByCode(item.qzt_response?.bank_code),
          bankCode: item.qzt_response?.bank_code,
          rawBankCardNo: item.qzt_response?.bank_card_no,
          qztAccountNo: item.qzt_response?.account_no
        }
      }))

      pagination.total = accountList.value.length
    }
  } catch (e) {
    console.error('获取账户列表失败:', e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchAccountList()
}

const handleReset = () => {
  filterForm.accountNo = ''
  filterForm.accountName = ''
  filterForm.enterpriseType = ''
  filterForm.splitRole = ''
  handleSearch()
}

const handleExpandChange = (row, expandedRows) => {
  expandedRow.value = expandedRows.length > 0 ? row.id : null
}

const viewBills = (row) => {
  router.push({ path: '/trade-message', query: { merchant_id: row.id } })
}

const viewSettleRecords = (row) => {
  router.push({ path: '/split-record', query: { merchant_id: row.id } })
}

const handleWithdraw = (row) => {
  currentAccount.value = row
  withdrawForm.amount = null
  withdrawForm.remark = ''
  showWithdrawDialog.value = true
}

const handleSubmitWithdraw = async () => {
  await withdrawFormRef.value?.validate()

  if (withdrawForm.amount > currentAccount.value.settleable) {
    ElMessage.warning('提现金额不能超过可结算金额')
    return
  }

  submitting.value = true
  try {
    const res = await applyWithdraw({
      merchant_id: currentAccount.value.id,
      account_no: currentAccount.value.qztAccountNo,
      amount: withdrawForm.amount,
      bank_card_no: currentAccount.value.rawBankCardNo,
      remark: withdrawForm.remark
    })

    if (res.code === 0) {
      ElMessage.success('提现申请已提交')
      showWithdrawDialog.value = false
      fetchAccountList()
    } else {
      ElMessage.error(res.message || '提现申请失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '提现申请失败')
  } finally {
    submitting.value = false
  }
}

const handleChangeBankCard = (row) => {
  currentAccount.value = row
  bankCardForm.bank_card_name = row.bankCardName || ''
  bankCardForm.bank_code = row.bankCode || ''
  bankCardForm.bank_card_no = ''
  bankCardForm.bank_province = ''
  bankCardForm.bank_city = ''
  bankCardForm.bank_branch = ''
  showBankCardDialog.value = true
}

const handleSubmitBankCard = async () => {
  await bankCardFormRef.value?.validate()

  submitting.value = true
  try {
    const res = await bindBankCard({
      merchant_id: currentAccount.value.id,
      account_no: currentAccount.value.qztAccountNo,
      bank_type: '2',
      bank_code: bankCardForm.bank_code,
      bank_card_no: bankCardForm.bank_card_no,
      bank_card_name: bankCardForm.bank_card_name,
      bank_province: bankCardForm.bank_province,
      bank_city: bankCardForm.bank_city,
      bank_branch: bankCardForm.bank_branch
    })

    if (res.code === 0) {
      ElMessage.success('结算卡变更成功')
      showBankCardDialog.value = false
      fetchAccountList()
    } else {
      ElMessage.error(res.message || '变更失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '变更失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  fetchAccountList()
})
</script>

<style scoped>
.page {
  padding: 20px 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 20px;
}

.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;
}

.filter-card {
  margin-bottom: 16px;
}

.filter-card .card-body {
  padding: 16px 20px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.card-body {
  padding: 0;
}

.account-name {
  font-weight: 500;
  color: #1a1a1a;
}

.balance-amount {
  font-weight: 600;
  color: #1976D2;
}

.remark-text {
  color: #666;
  font-size: 13px;
}

.pagination-wrapper {
  padding: 16px 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
}

/* 展开内容样式 */
.expand-content {
  padding: 20px 40px;
  background: #fafbfc;
}

.expand-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.expand-section {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #ebeef5;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.fund-info, .bank-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fund-row, .bank-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.fund-row.highlight {
  background: #f0f9ff;
  padding: 8px 12px;
  border-radius: 6px;
  margin: 0 -12px;
  padding-left: 12px;
  padding-right: 12px;
}

.fund-label, .bank-label {
  color: #666;
  font-size: 13px;
  min-width: 100px;
}

.fund-value {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}

.fund-value.secondary {
  color: #999;
  font-weight: 400;
  font-size: 14px;
}

.bank-value {
  font-size: 14px;
  color: #1a1a1a;
}

.highlight-amount {
  font-size: 20px;
  font-weight: 700;
  color: #1976D2;
}

/* 表格行样式 */
:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background: #f5f7fa;
}

:deep(.el-table--striped .el-table__body tr.el-table__row--striped td) {
  background: #fafbfc;
}
</style>
