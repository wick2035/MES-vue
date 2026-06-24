import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

function loadModule(relativePath) {
  const helperPath = path.resolve(relativePath)
  const source = fs.readFileSync(helperPath, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const commonJsExports = {}
  const sandbox = { exports: commonJsExports, module: { exports: commonJsExports } }
  vm.runInNewContext(outputText, sandbox, { filename: helperPath })
  return sandbox.module.exports
}

const {
  getApprovalCenterActions,
  getApprovalCenterStatusLabel,
  getApprovalCenterBusinessTypeLabel,
} = loadModule('src/lib/approvalCenter.ts')
const { getWorkOrderChangeStatusMeta } = loadModule('src/lib/workOrderChange.ts')

function keys(row) {
  return getApprovalCenterActions(row).map((item) => item.key)
}

function assertJsonEqual(actual, expected, message) {
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), message)
}

assert.equal(getApprovalCenterStatusLabel('todo'), '待我审批')
assert.equal(getApprovalCenterStatusLabel('done'), '已审批')
assert.equal(getApprovalCenterStatusLabel('rejected'), '已驳回')
assert.equal(getApprovalCenterStatusLabel('revoked'), '已撤回')

assert.equal(getApprovalCenterBusinessTypeLabel('ORDER_APPROVAL'), '生产工单审批')
assert.equal(getApprovalCenterBusinessTypeLabel('WORK_ORDER_CHANGE'), '工单变更')

assertJsonEqual(
  keys({ status: 'todo' }),
  ['view', 'approve', 'reject'],
  'todo workflow tasks expose view plus approval actions',
)

assertJsonEqual(keys({ status: 'done' }), ['view'], 'done workflow tasks are view-only')
assertJsonEqual(keys({ status: 'rejected' }), ['view'], 'rejected workflow tasks are view-only')
assertJsonEqual(keys({ status: 'revoked' }), ['view'], 'revoked workflow tasks are view-only')

assertJsonEqual(getWorkOrderChangeStatusMeta('APPROVING'), { label: '审批中', tone: 'warning' })
assertJsonEqual(getWorkOrderChangeStatusMeta('APPLIED'), { label: '已生效', tone: 'success' })
assertJsonEqual(getWorkOrderChangeStatusMeta('REJECTED'), { label: '已驳回', tone: 'danger' })
assertJsonEqual(getWorkOrderChangeStatusMeta('APPROVED'), { label: '已批准', tone: 'success' })
