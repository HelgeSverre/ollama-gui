import { describe, expect, it } from 'vitest'
import { md } from '.'

describe('markdown rendering', () => {
  it('escapes raw HTML from model output', () => {
    const html = md.render('<img src=x onerror=alert(1)> <script>alert(1)</script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
    expect(html).toContain('&lt;img')
  })

  it('does not create javascript: links', () => {
    expect(md.render('[x](javascript:alert(1))')).not.toContain('href="javascript:')
  })

  it('escapes a hostile code fence language', () => {
    const html = md.render('```"><img src=x onerror=alert(1)>\ncode\n```')
    expect(html).not.toContain('<img')
    expect(html).toContain('&quot;&gt;&lt;img')
  })

  it('renders code blocks with a language header, copy button and highlighting', () => {
    const html = md.render('```go\nfunc main() {}\n```')
    expect(html).toContain('<span>go</span>')
    expect(html).toContain('data-copy')
    expect(html).toContain('class="hljs language-go"')
    expect(html).toContain('hljs-keyword')
  })

  it('falls back to escaped plain text for unknown languages', () => {
    const html = md.render('```nosuchlang\n<b>\n```')
    expect(html).toContain('<span>nosuchlang</span>')
    expect(html).toContain('&lt;b&gt;')
    expect(html).toContain('class="hljs"')
  })

  it('opens links in a new tab without an opener', () => {
    const html = md.render('see https://example.com')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })
})
