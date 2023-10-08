import { format } from 'date-fns'

// noinspection JSUnusedLocalSymbols
const nanoToHHMMSS = (nanoSeconds: bigint): string => {
  const milliseconds = Number(nanoSeconds / BigInt(1e6))
  return format(new Date(milliseconds), 'HH:mm:ss')
}
