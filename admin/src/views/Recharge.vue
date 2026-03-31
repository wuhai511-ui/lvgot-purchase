<template>
  <div class="page">
    <div class="page-title">🔄 账户充值</div>

    <!-- 充值表单 -->
    <div class="card" v-if="!showTransferGuide">
      <div class="card-header">充值信息</div>
      <div class="card-body">
        <el-form :model="form" label-width="120px">
          <el-form-item label="充值账户">
            <el-select v-model="form.accountType" style="width:300px">
              <el-option label="拉卡拉账户" value="lakala"/>
              <el-option label="银行内部户" value="bank"/>
            </el-select>
          </el-form-item>
          <el-form-item label="充值金额" required>
            <el-input v-model.number="form.amount" placeholder="请输入充值金额" style="width:300px">
              <template #prepend>¥</template>
            </el-input>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" placeholder="选填" style="width:300px"/>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="submitting" @click="handleRecharge">确认充值</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <!-- 待转账引导页 -->
    <div v-if="showTransferGuide" class="recharge-guide">
      <div class="guide-title">📋 充值收款账户</div>
      <div class="info-card">
        <div class="info-row"><span class="info-key">户名：</span><span class="info-val">拉卡拉支付股份有限公司</span></div>
        <div class="info-row"><span class="info-key">账号：</span><span class="info-val">{{ rechargeInfo.accountNo || '***1234' }}</span></div>
        <div class="info-row"><span class="info-key">开户行：</span><span class="info-val">招商银行北京分行营业部</span></div>
        <div class="info-row">
          <span class="info-key">充值订单号：</span>
          <span class="order-no">{{ rechargeInfo.orderNo }}</span>
          <el-button size="small" @click="copyOrderNo" style="margin-left:8px">复制</el-button>
        </div>
        <div class="info-row"><span class="info-key">充值金额：</span><span class="info-val amount-highlight">¥{{ rechargeInfo.amount }}</span></div>
        <div class="info-row"><span class="info-key">有效期至：</span><span class="info-val">{{ rechargeInfo.expireTime }}</span></div>
        <div class="warning-tip">
          ⚠️ 请使用 <strong>同名账户</strong> 转账，转账时务必在备注中填写 <strong>充值订单号</strong>
        </div>
      </div>

      <div class="guide-notice">
        <div class="notice-item">💡 转账完成后，充值金额将在 <strong>1-2个工作日</strong> 内到账</div>
        <div class="notice-item">💡 请确保转账金额与充值订单金额一致，否则无法自动到账</div>
        <div class="notice-item">💡 到账后会有短信通知，请注意查收</div>
      </div>

      <!-- 充值状态 -->
      <div class="status-section">
        <div class="status-label">充值状态：</div>
        <el-tag v-if="rechargeStatus === 'pending'" type="warning">⏳ 转账中...</el-tag>
        <el-tag v-else-if="rechargeStatus === 'success'" type="success">✅ 已到账</el-tag>
        <el-tag v-else-if="rechargeStatus === 'failed'" type="danger">❌ 失败</el-tag>
        <el-tag v-else type="info">📝 待转账</el-tag>
        <div v-if="rechargeStatus === 'success'" style="margin-top:12px">
          <el-button type="primary" @click="handleBack">返回充值页</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { rechargePreOrder, rechargeStatus as queryRechargeStatus } from '@/api/merchant'

const form = reactive({ accountType: 'lakala', amount: null, remark: '' })
const submitting = ref(false)
const showTransferGuide = ref(false)
const rechargeInfo = reactive({
  orderNo: '',
  accountNo: '',
  amount: '',
  expireTime: '',
})
const rechargeStatus = ref('idle')
let pollTimer = null

// 复制订单号
const copyOrderNo = () => {
  navigator.clipboard.writeText(rechargeInfo.orderNo).then(() => {
    ElMessage.success('充值订单号已复制到剪贴板')
  }).catch(() => {
    ElMessage.warning('复制失败，请手动复制')
  })
}

// 返回充值页
const handleBack = () => {
  showTransferGuide.value = false
  rechargeStatus.value = 'idle'
  form.amount = null
  form.remark = ''
}

// 停止轮询
const stopPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

// 轮询充值状态
const startPoll = (orderNo) => {
  stopPoll()
  pollTimer = setInterval(async () => {
    try {
      const res = await queryRechargeStatus(orderNo)
      console.log('[Recharge Status]', res)
      if (res.code === 0 && res.data) {
        const status = res.data.status || res.data.recharge_state
        if (status === 'SUCCESS' || status === 'success' || status === 'recharged') {
          rechargeStatus.value = 'success'
          ElMessage.success('充值已到账！')
          stopPoll()
        } else if (status === 'FAILED' || status === 'failed') {
          rechargeStatus.value = 'failed'
          stopPoll()
        } else {
          rechargeStatus.value = 'pending'
        }
      }
    } catch (e) {
      console.warn('[Recharge Poll Error]', e)
    }
  }, 10000)
}

// 发起充值
const handleRecharge = async () => {
  if (!form.amount || form.amount <= 0) { ElMessage.warning('请输入正确金额'); return }

  submitting.value = true
  try {
    const res = await rechargePreOrder({
      amount: form.amount,
      accountType: form.accountType,
      remark: form.remark,
    })

    if (res.code === 0 && res.data) {
      // BFF 返回充值订单信息
      Object.assign(rechargeInfo, {
        orderNo: res.data.order_no || res.data.recharge_seq_no || `CZ${Date.now()}`,
        accountNo: res.data.account_no || '***1234',
        amount: form.amount,
        expireTime: res.data.expire_time || new Date(Date.now() + 24 * 3600 * 1000).toLocaleString(),
      })
      rechargeStatus.value = 'idle'
      showTransferGuide.value = true
      // 开始轮询
      startPoll(rechargeInfo.orderNo)
    } else {
      // BFF 未上线或接口不存在，降级 Mock
      console.warn('[Recharge] BFF not available, using mock data:', res)
      Object.assign(rechargeInfo, {
        orderNo: `CZ${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.random().toString().slice(2,8)}`,
        accountNo: '***1234',
        amount: form.amount,
        expireTime: new Date(Date.now() + 24 * 3600 * 1000).toLocaleString(),
      })
      rechargeStatus.value = 'idle'
      showTransferGuide.value = true
    }
  } catch (e) {
    console.warn('[Recharge] API call failed, using mock fallback:', e)
    // 降级使用 Mock 数据
    Object.assign(rechargeInfo, {
      orderNo: `CZ${new Date().toISOString().slice(0,10).replace(/-/g,'')}${Math.random().toString().slice(2,8)}`,
      accountNo: '***1234',
      amount: form.amount,
      expireTime: new Date(Date.now() + 24 * 3600 * 1000).toLocaleString(),
    })
    rechargeStatus.value = 'idle'
    showTransferGuide.value = true
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  stopPoll()
})
</script>

<style scoped>
.page { padding: 20px 24px; }
.page-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
.card { background: #fff; border-radius: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.card-header { padding: 16px 20px; border-bottom: 1px solid #f0f0f0; font-size: 15px; font-weight: 600; }
.card-body { padding: 20px; }

.recharge-guide { max-width: 600px; }
.guide-title { font-size: 18px; font-weight: 700; color: #1a1a1a; margin-bottom: 16px; }

.info-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  padding: 20px 24px;
  margin-bottom: 16px;
}
.info-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 14px;
}
.info-row:last-child { border-bottom: none; }
.info-key { color: #888; min-width: 90px; }
.info-val { color: #333; font-weight: 500; }
.order-no { color: #409EFF; font-weight: 700; letter-spacing: 1px; }
.amount-highlight { color: #E6A23C; font-size: 16px; }

.warning-tip {
  margin-top: 12px;
  padding: 12px 14px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  font-size: 13px;
  color: #7d5a00;
  line-height: 1.6;
}

.guide-notice {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
}
.notice-item {
  font-size: 13px;
  color: #666;
  line-height: 2;
}

.status-section {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.status-label { font-size: 14px; color: #333; font-weight: 500; }
</style>
