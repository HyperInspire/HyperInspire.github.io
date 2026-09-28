// Explicit IDs keep section links stable when the visible heading is translated.
// Usage: ## 中文标题 {#the-original-english-heading}
export function stableHeadingIds(md) {
  md.core.ruler.before('anchor', 'docs-stable-heading-ids', (state) => {
    for (let index = 0; index < state.tokens.length; index += 1) {
      const heading = state.tokens[index]
      const inline = state.tokens[index + 1]
      if (heading.type !== 'heading_open' || inline?.type !== 'inline') continue
      const match = inline.content.match(/\s+\{#([a-zA-Z][\w-]*)\}$/)
      if (!match) continue
      heading.attrSet('id', match[1])
      inline.content = inline.content.slice(0, match.index)
      inline.children = []
      md.inline.parse(inline.content, md, state.env, inline.children)
    }
  })
}
