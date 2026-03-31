<template>
  <div class="page">
    <div class="page-title">📜 分账记录</div>

    <!-- 发起分账按钮 -->
    <div class="action-bar">
      <el-button type="primary" @click="showSplitDialog = true">发起分账</el-button>
    </div>

    <div class="card">
      <div class="card-body">
        <el-table :data="records" stripe v-loading="loading">
          <el-table-column prop="splitNo" label="分账单号" width="200"/>
          <el-table-column prop="orderNo" label="关联订单" width="200"/>
          <el-table-column prop="payerName" label="付款方" width="150"/>
          <el-table-column prop="receiverName" label="收款方" width="150"/>
          <el-table-column prop="amount" label="分账金额" width="120">
            <template #default="{row}"><span class="money">¥{{ row.amount.toLocaleString() }}</span></template>
          </el-table-column>
          <el-table-column prop="fee" label="手续费" width="100">
            <template #default="{row}"><span class="money">¥{{ row.fee || '0.00' }}</span></template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{row}">
              <el-tag size="small" :type="row.status==='SUCCESS'||row.status==='success'?'success':'warning'">
                {{ statusMap[row.status] || row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="170"/>
        </el-table>
        <el-empty v-if="!loading && !records.length" description="暂无分账记录" />
      </div>
    </div>

    <!-- 发起分账弹窗 -->
    <el-dialog v-model="showSplitDialog" title="发起分账" width="480px">
      <el-form :model="splitForm" label-width="100px">
        <el-form-item label="收款方" required>
          <el-select v-model="splitForm.receiverId" placeholder="请选择收款方" style="width:100%">
            <el-option v-for="r in receivers" :key="r.id" :label="r.name" :value="r.id"/>
          </el-select>
        </el-form-item>
        <el-form-item label="分账金额" required>
          <el-input v-model.number="splitForm.amount" placeholder="请输入分账金额" style="width:100%">
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        <el-form-item label="分账说明">
          <el-input v-model="splitForm.remark" placeholder="如：旅游分账" />
        </el-form-item>
        <div v-if="splitForm.amount" class="fee-info">
          手续费：<span class="fee-amount">¥{{ fee }}</span>（0.1%，最低1元）
        </div>
      </el-form>
      <template #footer>
        <el-button @click="showSplitDialog=false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="doSplit">确认分账</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { splitPreOrder, splitConfirm } from '@/api/merchant'

const records = ref([])
const loading = ref(false)
const showSplitDialog = ref(false)
const submitting = ref(false)

const statusMap = {
  SUCCESS: '成功',
  success: '成功',
  PENDING: '处理中',
  pending: '处理中',
  FAILED: '失败',
  failed: '失败',
}

const receivers = [
  { name: '李四(导游)', id: 'G001' },
  { name: '张司机', id: 'D001' },
  { name: '王导游', id: 'G002' },
]

const splitForm = reactive({
  receiverId: '',
  amount: null,
  remark: '',
})

const fee = computed(() => {
  if (!splitForm.amount) return '0.00'
  return Math.max(1, Math.round(splitForm.amount * 0.001 * 100) / 100).toFixed(2)
})

// 加载分账记录
const loadRecords = async () => {
  loading.value = true
  try {
    // BFF 接口获取分账记录列表
    let res
    try {
      res = await splitPreOrder({})
    } catch (e) {
      console.warn('[SplitRecord] BFF not available:', e)
      res = { code: -1 }
    }

    if (res.code === 0 && Array.isArray(res.data)) {
      records.value = res.data
    } else {
      // 降级：使用静态 mock 数据
      records.value = [
        { splitNo: 'SP20260326001', orderNo: 'ORD20260326001', payerName: '顺风旅行社', receiverName: '李四 (导游)', amount: 750, fee: '0.75', status: 'success', createTime: '2026-03-26 10:30:00' },
        { splitNo: 'SP20260325001', orderNo: 'ORD20260326002', payerName: '顺风旅行社', receiverName: '李四 (导游)', amount: 1200, fee: '1.20', status: 'success', createTime: '2026-03-25 15:20:00' },
        { splitNo: 'SP20260324001', orderNo: 'ORD20260324001', payerName: '顺风旅行社', receiverName: '张司机', amount: 300, fee: '1.00', status: 'success', createTime: '2026-03-24 09:10:00' },
      ]
    }
  } catch (e) {
    console.error('[SplitRecord Error]', e)
  } finally {
    loading.value = false
  }
}

// 发起分账
const doSplit = async () => {
  if (!splitForm.receiverId || !splitForm.amount) {
    ElMessage.warning('请填写完整'); return
  }

  const receiver = receivers.find(r => r.id === splitForm.receiverId)
  submitting.value = true
  try {
    let res
    try {
      res = await splitPreOrder({
        receiver_id: splitForm.receiverId,
        receiver_name: receiver?.name,
        amount: splitForm.amount,
        remark: splitForm.remark,
      })
    } catch (e) {
      console.warn('[Split] BFF not available:', e)
      res = { code: -1 }
    }

    if (res.code === 0 && res.data) {
      // 模拟分账成功，添加到列表
      const newRecord = {
        splitNo: res.data.split_no || `SP${Date.now()}`,
        orderNo: res.data.order_no || 'ORD' + Date.now(),
        payerName: '当前账户',
        receiverName: receiver?.name || '—',
        amount: splitForm.amount,
        fee: fee.value,
        status: 'success',
        createTime: new Date().toLocaleString('zh-CN'),
      }
      records.value.unshift(newRecord)
      showSplitDialog.value = false
      ElMessage.success('分账成功')
      splitForm.amount = null
      splitForm.receiverId = ''
      splitForm.remark = ''
    } else {
      // BFF 未上线，降级 Mock
      const newRecord = {
        splitNo: `SP${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.random().toString().slice(2,8)}`,
        orderNo: 'ORD' + Date.now(),
        payerName: '当前账户',
        receiverName: receiver?.name || '—',
        amount: splitForm.amount,
        fee: fee.value,
        status: 'success',
        createTime: new Date().toLocaleString('zh-CN'),
      }
      records.value.unshift(newRecord)
      showSplitDialog.value = false
      ElMessage.success('分账成功（Mock）')
    }
  } catch (e) {
    ElMessage.error(e.message || '分账失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.action-bar { margin-bottom: 16px; display: flex; justify-content: flex-end; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-body { padding: 20px; }
.fee-info { font-size: 13px; color: #888; margin-top: -10px; margin-bottom: 16px; padding-left: 100px; }
.fee-amount { color: #E6A23C; font-weight: 600; }
</style>
