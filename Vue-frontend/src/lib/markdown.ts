import MarkdownIt from 'markdown-it'

/**
 * 统一的 Markdown 渲染器（用于 AI 助手回答）。
 * 安全：html:false 转义原始 HTML，避免 XSS；linkify 自动识别链接；breaks 将换行渲染为 <br>。
 */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
})

// 链接统一新开页并加 noopener，避免反向标签劫持
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/** 渲染 Markdown 文本为 HTML 字符串 */
export function renderMarkdown(src: string): string {
  return md.render(src || '')
}
