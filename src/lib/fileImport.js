// Extract plain text from TXT, PDF or DOCX in the browser.
// .pages is a zipped bundle with no reliable text layer; users export to PDF first.

export async function extractText(file) {
  const name = (file.name || '').toLowerCase()
  if (name.endsWith('.txt') || name.endsWith('.fountain') || name.endsWith('.md')) return await file.text()
  if (name.endsWith('.pdf')) return await pdfToText(file)
  if (name.endsWith('.docx')) return await docxToText(file)
  if (name.endsWith('.pages')) throw new Error('Pages files are not readable here. In Pages choose File > Export To > PDF, then upload the PDF.')
  if (name.endsWith('.doc')) throw new Error('Old .doc format is not supported. Save it as .docx or PDF first.')
  throw new Error('Unsupported file. Use TXT, PDF or DOCX.')
}

async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const pages = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    // rebuild lines from positioned items
    let lines = [], lastY = null, cur = []
    content.items.forEach(it => {
      const y = Math.round(it.transform[5])
      if (lastY !== null && Math.abs(y - lastY) > 2) { lines.push(cur.join('')); cur = [] }
      cur.push(it.str)
      if (it.hasEOL) { lines.push(cur.join('')); cur = []; lastY = null; return }
      lastY = y
    })
    if (cur.length) lines.push(cur.join(''))
    pages.push(lines.join('\n'))
  }
  return pages.join('\n\n')
}

async function docxToText(file) {
  const mammoth = await import('mammoth')
  const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return res.value
}
