/**
 * 系统模块 API（员工、部门、角色、权限）
 */
import { get, post } from './request.js'

/**
 * 获取员工列表
 * @param {Object} params - 查询参数
 */
export function getEmployees(params) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      list: [
        {
          id: 'E001',
          name: '张三',
          email: 'zhangsan@example.com',
          department: '技术部',
          role: '管理员',
          status: 'active',
        },
      ],
      total: 1,
    },
  })
}

/**
 * 添加员工
 * @param {Object} data - 员工数据
 */
export function addEmployee(data) {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      id: 'E' + Date.now(),
      name: data.name,
      status: 'pending',
    },
  })
}

/**
 * 获取部门列表
 */
export function getDepartments() {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      list: [
        { id: 'D001', name: '技术部', parentId: null },
        { id: 'D002', name: '运营部', parentId: null },
        { id: 'D003', name: '前端组', parentId: 'D001' },
      ],
      total: 3,
    },
  })
}

/**
 * 获取角色列表
 */
export function getRoles() {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      list: [
        { id: 'R001', name: '管理员', permissions: ['*'] },
        { id: 'R002', name: '普通员工', permissions: ['read'] },
      ],
      total: 2,
    },
  })
}

/**
 * 获取权限列表
 */
export function getPermissions() {
  return Promise.resolve({
    code: 0,
    message: 'success',
    data: {
      list: [
        { id: 'P001', name: 'read', label: '查看' },
        { id: 'P002', name: 'write', label: '编辑' },
        { id: 'P003', name: 'delete', label: '删除' },
        { id: 'P004', name: 'admin', label: '管理' },
      ],
      total: 4,
    },
  })
}
