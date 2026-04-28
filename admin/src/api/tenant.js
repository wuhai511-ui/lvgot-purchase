// admin/src/api/tenant.js
import { request } from './request'

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

export function createTenant(data) {
  return request({
    url: '/api/admin/tenants',
    method: 'post',
    data
  })
}

export function updateTenant(id, data) {
  return request({
    url: `/api/admin/tenants/${id}`,
    method: 'put',
    data
  })
}

export function deleteTenant(id) {
  return request({
    url: `/api/admin/tenants/${id}`,
    method: 'delete'
  })
}

export function resetTenantPassword(id, password) {
  return request({
    url: `/api/admin/tenants/${id}/reset-password`,
    method: 'put',
    data: { password }
  })
}

export function getTenantMerchants(tenantId, params) {
  return request({
    url: `/api/admin/tenants/${tenantId}/merchants`,
    method: 'get',
    params
  })
}
