// admin/src/api/tenant.js
import request from '@/utils/request'

export function getTenants(params) {
  return request({
    url: '/api/admin/tenants',
    method: 'get',
    params
  })
}

export function getTenantDetail(id) {
  return request({
    url: `/api/admin/tenants/${id}`,
    method: 'get'
  })
}

export function updateTenantStatus(id, status) {
  return request({
    url: `/api/admin/tenants/${id}/status`,
    method: 'put',
    data: { status }
  })
}

export function updateTenantFeatures(id, features) {
  return request({
    url: `/api/admin/tenants/${id}/features`,
    method: 'put',
    data: features
  })
}
