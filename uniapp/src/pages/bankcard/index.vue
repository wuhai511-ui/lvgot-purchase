<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">银行卡</text>
      <text class="nav-add" @click="showAdd=true">+ 添加</text>
    </view>

    <view class="card-list">
      <view v-if="cards.length===0" class="empty"><text>💳</text><text>暂未绑定银行卡</text></view>
      <view v-else v-for="c in cards" :key="c.id" class="bank-card">
        <view class="bank-icon">🏦</view>
        <view class="bank-detail">
          <view class="bank-name">{{ c.bankName }}</view>
          <view class="bank-no">{{ c.no }}</view>
        </view>
        <view v-if="c.isDefault" class="default-tag">默认</view>
        <view v-else class="unbind-btn" @click="unbind(c)">解绑</view>
      </view>
    </view>

    <van-popup v-model:show="showAdd" position="bottom" @click-overlay="showAdd=false">
      <view class="add-card-form">
        <view class="form-title">添加银行卡</view>
        <van-field v-model="newCard.name" label="持卡人" placeholder="请输入持卡人姓名" />
        <van-field v-model="newCard.no" label="卡号" placeholder="请输入银行卡号" />
        <van-field v-model="newCard.bankName" label="银行" placeholder="如：中国工商银行" />
        <van-field v-model="newCard.phone" label="手机号" type="tel" placeholder="请输入银行预留手机号" />
        <van-button type="primary" block round @click="doAddCard">确认添加</van-button>
      </view>
    </van-popup>
  </view>
</template>

<script setup>
import { ref } from 'vue'
const showAdd = ref(false)
const cards = ref([
  {id:1, bankName:'中国农业银行', no:'622202****0125', isDefault:true},
  {id:2, bankName:'中国建设银行', no:'621700****8765', isDefault:false},
])
const newCard = ref({name:'', no:'', bankName:'', phone:''})
const goBack = () => uni.navigateBack()
const doAddCard = () => {
  if(!newCard.value.name || !newCard.value.no) { uni.showToast({title:'请填写完整', icon:'none'}); return }
  cards.value.push({id:Date.now(), bankName:newCard.value.bankName, no:'****'+newCard.value.no.slice(-4), isDefault:false})
  showAdd.value=false; newCard.value={name:'', no:'', bankName:'', phone:''}
  uni.showToast({title:'添加成功', icon:'success'})
}
const unbind = (c) => uni.showModal({title:'解绑确认', content:'确定解绑该卡？', success:(r)=>{ if(r.confirm) { cards.value=cards.value.filter(x=>x.id!==c.id); uni.showToast({title:'已解绑', icon:'success'}) } }})
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';
.nav-add { margin-left:auto; color:$primary-color; font-size:14px; }
.card-list { padding:16px; }
.bank-card { display:flex; align-items:center; gap:14px; padding:16px; background:#fff; border-radius:$border-radius-lg; margin-bottom:12px; box-shadow:$shadow-md; }
.bank-icon { font-size:28px; }
.bank-detail { flex:1; }
.bank-name { font-size:15px; font-weight:600; }
.bank-no { font-size:12px; color:#888; margin-top:2px; }
.default-tag { padding:4px 12px; background:#e3f2fd; color:$primary-color; border-radius:12px; font-size:12px; }
.unbind-btn { color:#E53935; font-size:13px; }
.add-card-form { padding:20px; }
.form-title { font-size:16px; font-weight:600; text-align:center; margin-bottom:16px; }
.empty { text-align:center; padding:60px 0; display:flex; flex-direction:column; align-items:center; gap:12px; color:#888; }
</style>
