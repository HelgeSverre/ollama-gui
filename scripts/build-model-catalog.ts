/**
 * Regenerates src/data/model-catalog.json from the Ollama library using ollama-library-scraper.
 * The file is committed so builds need no network; refresh it with `bun run catalog:update`
 * (CI does this weekly, see .github/workflows/catalog.yml).
 *
 * The file is only rewritten when the model data changed, so an unchanged library leaves the
 * working tree clean and CI opens no PR.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { OllamaScraper } from 'ollama-library-scraper'
import { toCatalogModel, type Catalog } from '../src/domain/catalog'

const path = new URL('../src/data/model-catalog.json', import.meta.url)

const listing = await new OllamaScraper().getModelListing({ sort: 'most-popular' })
if (listing.length < 50) {
  throw new Error(
    `Only ${listing.length} models scraped; refusing to overwrite the catalog`,
  )
}
const models = listing.map(toCatalogModel)

const previous: Catalog | null = existsSync(path)
  ? JSON.parse(readFileSync(path, 'utf8'))
  : null
// CI uses the summary as the PR description
const writeSummary = (text: string) => {
  if (process.env.CATALOG_SUMMARY_FILE)
    writeFileSync(process.env.CATALOG_SUMMARY_FILE, text + '\n')
}

if (previous && JSON.stringify(previous.models) === JSON.stringify(models)) {
  console.log(`No changes (${models.length} models)`)
  writeSummary(`No changes (${models.length} models).`)
} else {
  const catalog: Catalog = { generatedAt: new Date().toISOString(), models }
  writeFileSync(path, JSON.stringify(catalog, null, 2) + '\n')
  const before = new Set(previous?.models.map((m) => m.name))
  const after = new Set(models.map((m) => m.name))
  const added = models.filter((m) => !before.has(m.name)).map((m) => m.name)
  const removed = [...before].filter((name) => !after.has(name))
  const summary = [
    `Refreshed the Ollama library snapshot: ${models.length} models.`,
    '',
    added.length ? `Added: ${added.map((n) => `\`${n}\``).join(', ')}` : 'Added: none',
    removed.length
      ? `Removed: ${removed.map((n) => `\`${n}\``).join(', ')}`
      : 'Removed: none',
    '',
    'Pull counts, sizes and capabilities of existing models may also have changed.',
  ].join('\n')
  console.log(summary)
  writeSummary(summary)
}
