/** Ollama library catalog, generated at build time by scripts/build-model-catalog.ts. */
export interface CatalogModel {
  name: string
  description: string
  /** Size tags such as "8b" or "270m"; pullable as `name:size`. */
  sizes: string[]
  capabilities: string[]
  pulls: number
  updated: string
}

export interface Catalog {
  generatedAt: string
  models: CatalogModel[]
}

/** Shape returned by ollama-library-scraper's getModelListing(). */
export interface ScrapedModel {
  name: string
  description: string
  parameters: string[]
  pulls: string
  lastUpdated: string
  capabilities?: string[]
}

/** "120.1M" → 120100000. Unparseable values become 0. */
export function parsePulls(value: string): number {
  const match = /^([\d.]+)\s*([KMB])?$/i.exec(value.trim())
  if (!match) return 0
  const scale =
    { K: 1e3, M: 1e6, B: 1e9 }[match[2]?.toUpperCase() as 'K' | 'M' | 'B'] ?? 1
  return Math.round(parseFloat(match[1]) * scale)
}

/**
 * Keeps size tags only. The listing page sometimes mixes in context lengths ("128k"),
 * which aren't pullable tags.
 */
export function isSizeTag(tag: string) {
  return /^e?\d+(\.\d+)?[mb]$/i.test(tag)
}

export function toCatalogModel(m: ScrapedModel): CatalogModel {
  return {
    name: m.name,
    description: m.description.trim(),
    sizes: m.parameters.filter(isSizeTag),
    capabilities: m.capabilities ?? [],
    pulls: parsePulls(m.pulls),
    updated: m.lastUpdated,
  }
}

export interface Suggestion {
  model: CatalogModel
  /** Size tag when the query names one, e.g. "qwen3:8" → "8b". */
  size?: string
  /** Full pull reference: `name` or `name:size`. */
  ref: string
}

/**
 * Ranks catalog models for a pull query. Name prefix beats word-start beats substring beats a
 * description hit; ties go to the more popular model. "name:size" narrows to matching sizes.
 */
export function searchCatalog(
  models: CatalogModel[],
  query: string,
  limit = 8,
): Suggestion[] {
  const raw = query.trim().toLowerCase()
  if (!raw) return []
  const [namePart, sizePart] = raw.split(':', 2)

  if (sizePart !== undefined) {
    const model = models.find((m) => m.name === namePart)
    if (!model) return []
    const sizes = model.sizes.filter((s) => s.startsWith(sizePart))
    return (sizes.length ? sizes : sizePart ? [] : model.sizes)
      .slice(0, limit)
      .map((size) => ({ model, size, ref: `${model.name}:${size}` }))
  }

  const scored: { model: CatalogModel; score: number }[] = []
  for (const model of models) {
    const name = model.name.toLowerCase()
    let score = 0
    if (name === namePart) score = 100
    else if (name.startsWith(namePart)) score = 80
    else if (name.split(/[-._]/).some((w) => w.startsWith(namePart))) score = 60
    else if (name.includes(namePart)) score = 40
    else if (namePart.length >= 3 && model.description.toLowerCase().includes(namePart))
      score = 10
    if (score) scored.push({ model, score })
  }
  scored.sort((a, b) => b.score - a.score || b.model.pulls - a.model.pulls)
  return scored.slice(0, limit).map(({ model }) => ({ model, ref: model.name }))
}

/** Most-pulled models that aren't installed yet, for the empty-input state. */
export function popularModels(
  models: CatalogModel[],
  installed: string[],
  limit = 8,
): CatalogModel[] {
  const have = new Set(installed.map((n) => n.split(':')[0]))
  return [...models]
    .filter((m) => !have.has(m.name) && !m.capabilities.includes('embedding'))
    .sort((a, b) => b.pulls - a.pulls)
    .slice(0, limit)
}

export function formatPulls(pulls: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(pulls)
}
