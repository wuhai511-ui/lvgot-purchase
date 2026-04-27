// admin/src/api/guide.js
import request from '@/utils/request'

export function getGuides(params) {
  return request({
    url: '/api/admin/guides',
    method: 'get',
    params
  })
}

export function getGuideDetail(id) {
  return request({
    url: `/api/admin/guides/${id}`,
    method: 'get'
  })
}

export function auditGuide(id, data) {
  return request({
    url: `/api/admin/guides/${id}/audit`,
    method: 'put',
    data
  })
}
