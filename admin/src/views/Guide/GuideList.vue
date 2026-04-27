<!-- admin/src/views/Guide/GuideList.vue -->
<template>
  <div class="guide-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>导游管理</span>
        </div>
      </template>

      <!-- 搜索栏 -->
      <el-form :inline="true" :model="searchForm" class="search-form">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="姓名/手机号/证号" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable>
            <el-option label="待审核" value="PENDING" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已驳回" value="REJECTED" />
            <el-option label="已激活" value="ACTIVE" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 表格 -->
      <el-table :data="tableData" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="register_name" label="姓名" />
        <el-table-column prop="legal_mobile" label="手机号" />
        <el-table-column prop="guide_cert_no" label="导游证号" />
        <el-table-column prop="guide_cert_img" label="导游证照片">
          <template #default="{ row }">
            <el-image
              v-if="row.guide_cert_img"
              :src="row.guide_cert_img"
              :preview-src-list="[row.guide_cert_img]"
              style="width: 60px; height: 60px"
              fit="cover"
            />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'PENDING'" type="warning">待审核</el-tag>
            <el-tag v-else-if="row.status === 'APPROVED'" type="success">已通过</el-tag>
            <el-tag v-else-if="row.status === 'REJECTED'" type="danger">已驳回</el-tag>
            <el-tag v-else type="success">已激活</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="申请时间" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              link
              type="primary"
              @click="handleAudit(row)"
            >
              审核
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        @current-change="fetchData"
      />
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditDialogVisible" title="导游证审核" width="500px">
      <el-form :model="auditForm" label-width="100px">
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.status">
            <el-radio label="APPROVED">通过</el-radio>
            <el-radio label="REJECTED">驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="auditForm.status === 'REJECTED'" label="驳回原因">
          <el-input
            v-model="auditForm.reject_reason"
            type="textarea"
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitAudit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getGuides, auditGuide } from '@/api/guide'

const loading = ref(false)
const tableData = ref([])
const searchForm = reactive({
  keyword: '',
  status: ''
})
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const auditDialogVisible = ref(false)
const auditForm = reactive({
  id: null,
  status: 'APPROVED',
  reject_reason: ''
})

async function fetchData() {
  loading.value = true
  try {
    const res = await getGuides({
      keyword: searchForm.keyword,
      status: searchForm.status
    })
    if (res.code === 0) {
      tableData.value = res.data || []
      pagination.total = tableData.value.length
    } else {
      ElMessage.error(res.message || '获取导游列表失败')
    }
  } catch (err) {
    console.error('获取导游列表失败:', err)
    ElMessage.error('获取导游列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchData()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  handleSearch()
}

function handleView(row) {
  ElMessage.info('查看导游详情功能开发中')
}

function handleAudit(row) {
  auditForm.id = row.id
  auditForm.status = 'APPROVED'
  auditForm.reject_reason = ''
  auditDialogVisible.value = true
}

async function submitAudit() {
  if (auditForm.status === 'REJECTED' && !auditForm.reject_reason.trim()) {
    ElMessage.warning('请填写驳回原因')
    return
  }
  try {
    const res = await auditGuide(auditForm.id, {
      status: auditForm.status,
      reject_reason: auditForm.reject_reason
    })
    if (res.code === 0) {
      ElMessage.success('审核提交成功')
      auditDialogVisible.value = false
      fetchData()
    } else {
      ElMessage.error(res.message || '审核提交失败')
    }
  } catch (err) {
    console.error('审核提交失败:', err)
    ElMessage.error('审核提交失败')
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.guide-list {
  padding: 20px;
}
.search-form {
  margin-bottom: 20px;
}
</style>