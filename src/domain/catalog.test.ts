import { describe, expect, it } from 'vitest'
import catalogFile from '../data/model-catalog.json'
import {
  isSizeTag,
  parsePulls,
  popularModels,
  searchCatalog,
  toCatalogModel,
  type CatalogModel,
} from './catalog'

const model = (
  name: string,
  pulls: number,
  extra: Partial<CatalogModel> = {},
): CatalogModel => ({
  name,
  description: '',
  sizes: [],
  capabilities: [],
  pulls,
  updated: '',
  ...extra,
})

const models = [
  model('llama3.1', 120e6, { sizes: ['8b', '70b', '405b'] }),
  model('qwen3', 30e6, {
    sizes: ['0.6b', '1.7b', '4b', '8b', '14b'],
    capabilities: ['thinking'],
  }),
  model('qwen3-vl', 5e6, { sizes: ['2b', '8b'], capabilities: ['vision'] }),
  model('qwen2.5-coder', 20e6, { sizes: ['7b'] }),
  model('codeqwen', 1e6),
  model('llava', 10e6, {
    description: 'A vision model for image understanding',
    capabilities: ['vision'],
  }),
  model('nomic-embed-text', 90e6, { capabilities: ['embedding'] }),
]

describe('parsePulls', () => {
  it('parses compact counts', () => {
    expect(parsePulls('120.1M')).toBe(120_100_000)
    expect(parsePulls('950K')).toBe(950_000)
    expect(parsePulls('1.2B')).toBe(1_200_000_000)
    expect(parsePulls('42')).toBe(42)
    expect(parsePulls('n/a')).toBe(0)
  })
})

describe('isSizeTag', () => {
  it('keeps parameter sizes and drops context lengths', () => {
    for (const tag of ['8b', '0.6b', '270m', 'e2b', '405B'])
      expect(isSizeTag(tag)).toBe(true)
    for (const tag of ['128k', '16k', 'latest', 'q4_K_M'])
      expect(isSizeTag(tag)).toBe(false)
  })
})

describe('toCatalogModel', () => {
  it('normalises a scraped listing entry', () => {
    expect(
      toCatalogModel({
        name: 'qwen2.5',
        description: ' Qwen 2.5 ',
        parameters: ['128k', '0.5b', '7b'],
        pulls: '24.1M',
        lastUpdated: '1 year ago',
      }),
    ).toEqual({
      name: 'qwen2.5',
      description: 'Qwen 2.5',
      sizes: ['0.5b', '7b'],
      capabilities: [],
      pulls: 24_100_000,
      updated: '1 year ago',
    })
  })
})

describe('searchCatalog', () => {
  const refs = (q: string) => searchCatalog(models, q).map((s) => s.ref)

  it('ranks prefix matches first, then by popularity', () => {
    expect(refs('qwe')).toEqual(['qwen3', 'qwen2.5-coder', 'qwen3-vl', 'codeqwen'])
  })

  it('matches word starts inside hyphenated names', () => {
    expect(refs('vl')[0]).toBe('qwen3-vl')
    expect(refs('coder')).toContain('qwen2.5-coder')
  })

  it('falls back to descriptions for longer queries', () => {
    expect(refs('image')).toEqual(['llava'])
    expect(refs('im')).toEqual([])
  })

  it('lists sizes after a colon and filters them by prefix', () => {
    expect(refs('qwen3:')).toEqual([
      'qwen3:0.6b',
      'qwen3:1.7b',
      'qwen3:4b',
      'qwen3:8b',
      'qwen3:14b',
    ])
    expect(refs('qwen3:1')).toEqual(['qwen3:1.7b', 'qwen3:14b'])
    expect(refs('qwen3:999')).toEqual([])
    expect(refs('unknown:8b')).toEqual([])
  })

  it('returns nothing for an empty query', () => {
    expect(refs('  ')).toEqual([])
  })
})

describe('popularModels', () => {
  it('skips installed and embedding models', () => {
    const names = popularModels(models, ['llama3.1:8b'], 3).map((m) => m.name)
    expect(names).toEqual(['qwen3', 'qwen2.5-coder', 'llava'])
  })
})

describe('bundled catalog', () => {
  it('is a sane snapshot of the Ollama library', () => {
    expect(catalogFile.models.length).toBeGreaterThan(100)
    expect(Number.isNaN(Date.parse(catalogFile.generatedAt))).toBe(false)
    for (const m of catalogFile.models) {
      expect(m.name).toMatch(/^[a-z0-9][\w.-]*$/)
      expect(m.sizes.every(isSizeTag)).toBe(true)
    }
  })
})
