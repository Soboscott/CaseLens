import { strToU8, zipSync } from 'fflate'

export async function createCasePackage(screenshot: Blob, summary: string): Promise<Blob> {
  const imageBytes = new Uint8Array(await screenshot.arrayBuffer())
  // PNG is already compressed. Store it without recompressing it.
  const archive = zipSync({
    'caselens-annotated.png': [imageBytes, { level: 0 }],
    'caselens-support-summary.txt': [strToU8(summary), { level: 6 }],
  })
  return new Blob([new Uint8Array(archive)], { type: 'application/zip' })
}
