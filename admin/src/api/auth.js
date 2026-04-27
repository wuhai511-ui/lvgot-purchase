// admin/src/api/auth.js
import { request } from './request'

export function login(username, password) {
  return request({
    url: '/api/auth/login',
    method: 'post',
    data: { username, password }
  })
}

export function getTenantInfo() {
  return request({
    url: '/api/auth/me',
    method: 'get'
  })
}
