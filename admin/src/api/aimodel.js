// admin/src/api/aimodel.js
import { request } from './request'

export function getAIModels(params) {
  return request({
    url: '/api/admin/ai-models',
    method: 'get',
    params
  })
}

export function getAIModelDetail(id) {
  return request({
    url: `/api/admin/ai-models/${id}`,
    method: 'get'
  })
}

export function createAIModel(data) {
  return request({
    url: '/api/admin/ai-models',
    method: 'post',
    data
  })
}

export function updateAIModel(id, data) {
  return request({
    url: `/api/admin/ai-models/${id}`,
    method: 'put',
    data
  })
}

export function deleteAIModel(id) {
  return request({
    url: `/api/admin/ai-models/${id}`,
    method: 'delete'
  })
}
