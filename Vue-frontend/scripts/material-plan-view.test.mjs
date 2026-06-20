import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const viewPath = path.resolve('src/views/production/MaterialPlanView.vue')
const source = fs.readFileSync(viewPath, 'utf8')

const columnsMatch = source.match(/const columns: TableColumn\[\] = \[([\s\S]*?)\]\n/)
assert.ok(columnsMatch, 'MaterialPlanView should define a TableColumn[] columns array')

const columnsSource = columnsMatch[1]
const firstColumn = columnsSource.match(/\{\s*key:\s*'([^']+)'[\s\S]*?title:\s*'([^']+)'/)
assert.deepEqual(
  firstColumn && [firstColumn[1], firstColumn[2]],
  ['select', '选择'],
  'the selection column must be the first visible table column',
)

assert.match(
  columnsSource,
  /\{\s*key:\s*'productName'[\s\S]*?title:\s*'产品'[\s\S]*?width:\s*'140px'/,
  'the product column should have a compact fixed width',
)

assert.match(
  columnsSource,
  /\{\s*key:\s*'action'[\s\S]*?title:\s*'操作'[\s\S]*?slot:\s*'action'/,
  'row actions must live in a dedicated 操作 column',
)

const materialSlot = source.match(/<template #material="\{ row \}">([\s\S]*?)<\/template>/)
assert.ok(materialSlot, 'MaterialPlanView should render the material slot')
assert.doesNotMatch(
  materialSlot[1],
  /type="checkbox"/,
  'checkboxes should not be embedded in the material column',
)

assert.match(
  source,
  /<template #select="\{ row \}">/,
  'MaterialPlanView should render a select slot',
)
assert.match(
  source,
  /<template #action="\{ row \}">/,
  'MaterialPlanView should render an action slot',
)
