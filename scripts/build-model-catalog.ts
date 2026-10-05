/**
 * Regenerates src/data/model-catalog.json from the Ollama library using ollama-library-scraper.
 * The file is committed so builds need no network; refresh it with `bun run catalog:update`.
 */
import { writeFileSync } from 'node:fs'
import { OllamaScraper } from 'ollama-library-scraper'
import { toCatalogModel, type Catalog } from '../src/domain/catalog'

const scraper = new OllamaScraper()
const listing = await scraper.getModelListing({ sort: 'most-popular' })
if (listing.length < 50)
  throw new Error(
    `Only ${listing.length} models scraped; refusing to overwrite the catalog`,
  )

const catalog: Catalog = {
  generatedAt: new Date().toISOString(),
  models: listing.map(toCatalogModel),
}
const path = new URL('../src/data/model-catalog.json', import.meta.url)
writeFileSync(path, JSON.stringify(catalog) + '\n')
console.log(`Wrote ${catalog.models.length} models to src/data/model-catalog.json`)
