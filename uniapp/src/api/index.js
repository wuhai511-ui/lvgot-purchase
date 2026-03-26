import request from '@/utils/request.js'

export const accountApi = {
  open: (data) => request.mockRequest('/account', 'POST', data),
  info: () => request.mockRequest('/account', 'GET'),
  upgrade: (data) => request.mockRequest('/account/upgrade', 'POST', data),
}

export const orderApi = {
  list: (params) => request.mockRequest('/order', 'GET', params),
  detail: (id) => request.mockRequest(`/order/${id}`, 'GET'),
}

export const splitApi = {
  records: (params) => request.mockRequest('/split', 'GET', params),
  create: (data) => request.mockRequest('/split', 'POST', data),
}
