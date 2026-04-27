<template>
  <div class="page">
    <div class="page-title">支付订单</div>

    <!-- 筛选区 -->
    <div class="card" style="margin-bottom:12px;">
      <div class="card-body" style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;">
        <el-input v-model="search.order_no" placeholder="订单号" style="width:200px;" clearable @keyup.enter="loadData"/>
        <el-input v-model="search.store_name" placeholder="门店名称" style="width:160px;" clearable @keyup.enter="loadData"/>
        <el-select v-model="search.pay_status" placeholder="支付状态" style="width:120px;" clearable>
          <el-option label="全部" value=""/>
          <el-option label="已支付" value="SUCCESS"/>
          <el-option label="待支付" value="PENDING"/>
          <el-option label="失败" value="FAIL"/>
        </el-select>
        <el-select v-model="search.split_status" placeholder="分账状态" style="width:120px;" clearable>
          <el-option label="全部" value=""/>
          <el-option label="待分账" value="PENDING"/>
          <el-option label="已分账" value="SUCCESS"/>
          <el-option label="分账中" value="PROCESSING"/>
        </el-select>
        <el-button type="primary" @click="loadData">查询</el-button>
        <el-button @click="search = {order_no:'',store_name:'',pay_status:'',split_status:''}; loadData()">重置</el-button>
      </div>
    </div>

    <!-- 订单列表 -->
    <div class="card">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column label="订单号" width="220">
          <template #default="{row}">
            <el-button type="primary" link size="small" @click="showDetail(row)">{{ row.order_no }}</el-button>
          </template>
        </el-table-column>
        <el-table-column prop="store_name" label="门店" width="150"/>
        <el-table-column label="金额" width="120" align="right">
          <template #default="{row}">¥{{ toYuan(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="pay_method" label="支付方式" width="100"/>
        <el-table-column label="支付状态" width="100">
          <template #default="{row}">
            <el-tag :type="row.pay_status === 'SUCCESS' ? 'success' : row.pay_status === 'FAIL' ? 'danger' : 'warning'" size="small">
              {{ row.pay_status === 'SUCCESS' ? '已支付' : row.pay_status === 'FAIL' ? '失败' : '待支付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分账状态" width="100">
          <template #default="{row}">
            <el-tag :type="row.split_status === 'SUCCESS' ? 'success' : row.split_status === 'PROCESSING' ? 'warning' : 'info'" size="small">
              {{ row.split_status === 'SUCCESS' ? '已分账' : row.split_status === 'PROCESSING' ? '分账中' : '待分账' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="退款状态" width="100">
          <template #default="{row}">
            <el-tag :type="row.refund_status === 'SUCCESS' ? 'danger' : row.refund_status === 'PARTIAL' ? 'warning' : 'info'" size="small">
              {{ row.refund_status === 'SUCCESS' ? '已退款' : row.refund_status === 'PARTIAL' ? '部分退款' : '无' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="170">
          <template #default="{row}">{{ formatTime(row.created_at) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{row}">
            <el-button v-if="row.split_status === 'PENDING'" type="primary" link size="small" :loading="splitting === row.order_no" @click="handleSplit(row)">分账</el-button>
            <span v-else>-</span>
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

    <!-- 订单详情弹窗 -->
    <el-dialog v-model="showDetailDialog" :title="'订单详情 - ' + (detailData?.order_no || '')" width="700px">
      <template v-if="detailData">
        <el-descriptions :column="2" border style="margin-bottom:16px;">
          <el-descriptions-item label="订单号" :span="2">{{ detailData.order_no }}</el-descriptions-item>
          <el-descriptions-item label="门店名称">{{ detailData.store_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="旅行团">{{ detailData.tour_group_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ toYuan(detailData.amount) }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ detailData.pay_method || '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付状态">
            <el-tag :type="detailData.pay_status === 'SUCCESS' ? 'success' : 'warning'" size="small">{{ detailData.pay_status || '-' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="分账状态">
            <el-tag :type="detailData.split_status === 'SUCCESS' ? 'success' : 'info'" size="small">{{ detailData.split_status || '-' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="退款状态">
            <el-tag :type="detailData.refund_status === 'SUCCESS' ? 'danger' : 'info'" size="small">{{ detailData.refund_status || '-' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ detailData.remark || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ formatTime(detailData.created_at) }}</el-descriptions-item>
        </el-descriptions>

        <!-- 支付流水 -->
        <div class="section-title">支付流水</div>
        <el-table :data="detailData.payment_flows || []" stripe size="small">
          <el-table-column prop="flow_no" label="流水号" width="200"/>
          <el-table-column label="金额" width="100" align="right">
            <template #default="{row}">¥{{ toYuan(row.amount) }}</template>
          </el-table-column>
          <el-table-column prop="pay_method" label="支付方式" width="100"/>
          <el-table-column label="状态" width="80">
            <template #default="{row}">
              <el-tag :type="row.pay_status === 'SUCCESS' ? 'success' : 'warning'" size="small">{{ row.pay_status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="trade_time" label="交易时间" width="170"/>
        </el-table>
        <div v-if="!(detailData.payment_flows || []).length" style="text-align:center;padding:16px;color:#999;">暂无支付流水</div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getPayOrders, triggerSplit, getOrderDetail } from '@/api/order'

const loading = ref(false)
const splitting = ref('')
const showDetailDialog = ref(false)
const detailData = ref(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const list = ref([])
const search = reactive({ order_no: '', store_name: '', pay_status: '', split_status: '' })

const toYuan = (val) => (parseFloat(val || 0) / 100).toFixed(2)
const formatTime = (time) => time ? time.replace('T', ' ').substring(0, 19) : '-'

const loadData = async () => {
  loading.value = true
  try {
    const params = {
      order_no: search.order_no || undefined,
      store_id: search.store_name || undefined,
      pay_status: search.pay_status || undefined,
      split_status: search.split_status || undefined,
      page: page.value,
      pageSize: pageSize.value
    }
    const res = await getPayOrders(params)
    if (res.code === 0) {
      list.value = res.data?.list || []
      total.value = res.data?.total || 0
    }
  } catch (e) {
    console.error('获取支付订单列表失败:', e)
  } finally {
    loading.value = false
  }
}

const showDetail = async (row) => {
  try {
    const res = await getOrderDetail(row.order_no)
    if (res.code === 0) {
      detailData.value = res.data
      showDetailDialog.value = true
    } else {
      ElMessage.error(res.message || '获取订单详情失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '获取订单详情失败')
  }
}

const handleSplit = async (row) => {
  splitting.value = row.order_no
  try {
    const res = await triggerSplit(row.order_no)
    if (res.code === 0) {
      const msg = res.data?.message || '分账已提交'
      ElMessage.success(msg)
      loadData()
    } else {
      ElMessage.error(res.message || '分账失败')
    }
  } catch (e) {
    ElMessage.error(e.message || '分账失败')
  } finally {
    splitting.value = ''
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); margin-bottom: 16px; }
.card-body { padding: 20px; }
.section-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
</style>
