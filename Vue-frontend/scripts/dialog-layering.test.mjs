import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const checks = [
  {
    file: 'src/components/ui/alert-dialog/AlertDialogContent.vue',
    overlay: 'fixed inset-0 z-[100]',
    content: 'z-[110] pointer-events-auto',
  },
  {
    file: 'src/components/ui/dialog/DialogContent.vue',
    overlay: 'fixed inset-0 z-[100]',
    content: 'z-[110] pointer-events-auto',
  },
  {
    file: 'src/components/ui/dialog/DialogScrollContent.vue',
    overlay: 'fixed inset-0 z-[100]',
    content: 'z-[110] pointer-events-auto',
  },
]

const datePickerFile = 'src/components/ui/date-picker/DatePicker.vue'
const floatingLayerChecks = [
  'src/components/ui/popover/PopoverContent.vue',
  'src/components/ui/select/SelectContent.vue',
]

const failures = []

for (const check of checks) {
  const source = fs.readFileSync(path.join(root, check.file), 'utf8')
  if (!source.includes(check.overlay)) {
    failures.push(`${check.file}: overlay is not pinned below dialog content`)
  }
  if (!source.includes(check.content)) {
    failures.push(`${check.file}: content is not above overlay with pointer events enabled`)
  }
}

const datePickerSource = fs.readFileSync(path.join(root, datePickerFile), 'utf8')
if (!datePickerSource.includes('z-[1000]')) {
  failures.push(`${datePickerFile}: calendar popover must render above dialog content`)
}

for (const file of floatingLayerChecks) {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  if (!source.includes('z-[1000]') || !source.includes('z-index: 1000')) {
    failures.push(`${file}: floating picker content must render above dialog content`)
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('dialog layering checks passed')
