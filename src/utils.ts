import { format } from 'date-fns'

// noinspection JSUnusedLocalSymbols
const nanoToHHMMSS = (nanoSeconds: bigint): string => {
  const milliseconds = Number(nanoSeconds / BigInt(1e6))
  return format(new Date(milliseconds), 'HH:mm:ss')
}

/**
 * Preprocesses LaTeX style math delimiters into KaTeX compatible syntax.
 * 
 * This function converts LaTeX-style delimiters to the dollar sign format 
 * expected by KaTeX and markdown-it-katex:
 * - Converts \[...\] (LaTeX display math) to $$...$$ (KaTeX display math)
 * - Converts \(...\) (LaTeX inline math) to $...$ (KaTeX inline math)
 * 
 * This preprocessing is necessary because markdown-it typically interprets
 * backslashes as escape characters, causing LaTeX delimiters to be removed
 * during rendering. By converting to dollar sign notation, we ensure proper
 * math rendering while preserving the original LaTeX content.
 * 
 * @param source - The original markdown string containing LaTeX math expressions
 * @returns The processed string with LaTeX delimiters converted to KaTeX format
 */
export const preprocessLatex = (source: string): string => {
  let processed = source.replace(/\\\[/g, '$$')
  processed = processed.replace(/\\\]/g, '$$')
  processed = processed.replace(/\\\(/g, '$')
  processed = processed.replace(/\\\)/g, '$')
  
  return processed
}