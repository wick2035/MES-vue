import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const helperPath = path.resolve('src/lib/productionOrderActions.ts')
const source = fs.readFileSync(helperPath, 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})

const commonJsExports = {}
const sandbox = { exports: commonJsExports, module: { exports: commonJsExports } }
vm.runInNewContext(outputText, sandbox, { filename: helperPath })

const { getProductionOrderActions } = sandbox.module.exports

function keys(row) {
  return getProductionOrderActions(row).map((item) => item.key)
}

function expectKeys(row, expected, message) {
  assert.equal(JSON.stringify(keys(row)), JSON.stringify(expected), message)
}

expectKeys(
  { status: 'DRAFT', approvalStatus: 'DRAFT', operationStatus: 'NONE' },
  ['view', 'edit', 'confirm', 'submit', 'delete'],
  'draft orders expose only first-step actions plus view/delete',
)

expectKeys(
  { status: 'WORK_ORDER_CREATED', approvalStatus: 'APPROVING', operationStatus: 'NONE' },
  ['view', 'delete'],
  'approving orders hide future workflow actions',
)

expectKeys(
  { status: 'CONFIRMED', approvalStatus: 'APPROVED', operationStatus: 'WAIT_CALC' },
  ['view', 'equipmentDispatch', 'employeeDispatch', 'delete'],
  'approved wait-calc orders expose assignment actions only',
)

expectKeys(
  { status: 'CONFIRMED', approvalStatus: 'APPROVED', operationStatus: 'WAIT_ASSIGN' },
  ['view', 'equipmentDispatch', 'employeeDispatch', 'delete'],
  'approved wait-assign orders expose assignment actions only',
)

expectKeys(
  { status: 'CONFIRMED', approvalStatus: 'APPROVED', operationStatus: 'ASSIGNED' },
  ['view', 'materialPlan', 'equipmentDispatch', 'employeeDispatch', 'dispatch', 'delete'],
  'assigned orders expose dispatch after prerequisite actions',
)

expectKeys(
  { status: 'WORK_ORDER_CREATED', approvalStatus: 'APPROVED', operationStatus: 'DISPATCHED' },
  ['view', 'materialPlan', 'equipmentDispatch', 'employeeDispatch', 'delete'],
  'dispatched orders keep review/navigation actions and hide completed dispatch',
)
