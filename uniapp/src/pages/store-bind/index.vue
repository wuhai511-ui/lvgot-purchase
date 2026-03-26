<template>
  <view class="page-container">
    <view class="nav-bar">
      <text class="nav-back" @click="goBack">←</text>
      <text class="nav-title">门店绑定</text>
    </view>

    <view class="search-bar">
      <input
        class="search-input"
        v-model="keyword"
        placeholder="搜索门店名称"
        @confirm="searchStore"
      />
      <view class="search-btn" @click="searchStore">搜索</view>
    </view>

    <view class="store-list">
      <view v-if="filteredStores.length === 0" class="empty">
        <text>🏪</text>
        <text>暂无门店</text>
      </view>
      <view
        v-else
        v-for="s in filteredStores"
        :key="s.merchantNo"
        class="store-item"
      >
        <view class="store-info">
          <view class="store-name">{{ s.merchantName }}</view>
          <view class="store-meta">
            <text class="store-industry">{{ s.industry }}</text>
            <text class="store-area">{{ s.area }}</text>
          </view>
        </view>
        <view v-if="s.binded" class="binded-tag">已绑定</view>
        <view v-else class="bind-btn" @click="bindStore(s)">绑定</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      keyword: '',
      stores: [
        {
          merchantNo: 'M001',
          merchantName: '三亚免税店A区',
          industry: '零售',
          area: '三亚市',
          binded: true
        },
        {
          merchantNo: 'M002',
          merchantName: '海口旅游大巴站',
          industry: '交通',
          area: '海口市',
          binded: false
        },
        {
          merchantNo: 'M003',
          merchantName: '亚龙湾度假酒店',
          industry: '酒店',
          area: '三亚市',
          binded: false
        },
        {
          merchantNo: 'M004',
          merchantName: '凤凰机场免税店',
          industry: '零售',
          area: '三亚市',
          binded: false
        },
        {
          merchantNo: 'M005',
          merchantName: '博鳌免税购物中心',
          industry: '零售',
          area: '琼海市',
          binded: false
        },
        {
          merchantNo: 'M006',
          merchantName: '万宁神州半岛酒店',
          industry: '酒店',
          area: '万宁市',
          binded: false
        }
      ]
    }
  },
  computed: {
    filteredStores() {
      if (!this.keyword.trim()) return this.stores
      return this.stores.filter(s =>
        s.merchantName.includes(this.keyword.trim())
      )
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    searchStore() {
      if (!this.keyword.trim()) {
        uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
        return
      }
      const results = this.filteredStores
      if (results.length === 0) {
        uni.showToast({ title: '未找到相关门店', icon: 'none' })
      } else {
        uni.showToast({ title: `找到 ${results.length} 个门店`, icon: 'none' })
      }
    },
    bindStore(s) {
      uni.showModal({
        title: '绑定确认',
        content: `确定绑定「${s.merchantName}」？`,
        success: (res) => {
          if (res.confirm) {
            s.binded = true
            uni.showToast({ title: '绑定成功', icon: 'success' })
          }
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
@import '@/static/styles/variables.scss';

.page-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.nav-bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #eee;
}

.nav-back {
  font-size: 18px;
  color: #333;
  margin-right: 12px;
}

.nav-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.search-bar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  margin-bottom: 8px;
}

.search-input {
  flex: 1;
  padding: 10px 14px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.search-btn {
  padding: 10px 18px;
  background: $primary-gradient;
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
}

.store-list {
  padding: 0 16px;
}

.store-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  background: #fff;
  border-radius: $border-radius-md;
  margin-bottom: 8px;
  box-shadow: $shadow-sm;
}

.store-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.store-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.store-industry,
.store-area {
  font-size: 12px;
  color: #888;
}

.store-industry::after {
  content: '·';
  margin-left: 8px;
}

.bind-btn {
  padding: 6px 16px;
  background: $primary-gradient;
  color: #fff;
  border-radius: 16px;
  font-size: 13px;
}

.binded-tag {
  padding: 6px 16px;
  background: #e8f5e9;
  color: #4caf50;
  border-radius: 16px;
  font-size: 13px;
}

.empty {
  text-align: center;
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #888;
  font-size: 14px;
}
</style>
