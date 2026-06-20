import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

const helperPath = path.resolve('src/lib/approvalCenter.ts')
const source = fs.readFileSync(helperPath, 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})

const commonJsExports = {}
const sandbox = { exports: commonJsExports, module: { exports: commonJsExports } }
vm.runInNewContext(outputText, sandbox, { filename: helperPath })

const { getApprovalCenterActions, getApprovalCenterStatue } = sandbox.module.exports

function keys(row) {
  return getApprovalCenterActions(row).map((item) => item.key)
}

assert.equal(getApprovalCenterStatue('todo'), 1, 'todo tab queries pending work orders')
assert.equal(getApprovalCenterStatue('approved'), 2, 'approved tab queries approved work orders')

assert.equal(
  JSON.stringify(keys({ statue: 1 })),
  JSON.stringify(['view', 'approve', 'reject']),
  'pending rows expose view plus approval actions',
)

assert.equal(
  JSON.stringify(keys({ statue: 2 })),
  JSON.stringify(['view']),
  'approved rows remain viewable and cannot be approved again',
)
