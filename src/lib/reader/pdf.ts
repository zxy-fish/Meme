import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'

let configured = false

export async function loadPdfDocument(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await import('pdfjs-dist')
  if (!configured) {
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
    configured = true
  }
  return pdfjs.getDocument({ data }).promise
}

export async function getPdfPageCount(data: ArrayBuffer): Promise<number> {
  const document = await loadPdfDocument(data)
  const count = document.numPages
  await document.cleanup()
  return count
}
