/*
  Turns an uploaded file into plain screenplay text.
  Supported: .txt .fountain .fdx (Final Draft) .pdf .docx
  Apple Pages (.pages) is a zipped bundle without a stable text layer,
  export it to PDF or DOCX first.
*/

export const ACCEPTED = '.txt,.fountain,.fdx,.pdf,.docx'

export async function extractText(file) {
  const name = file.name.toLowerCase()
  const ext = name.split('.').pop()
  if (ext === 'txt' || ext === 'fountain') {
    return { text: await file.text(), format: ext }
  }
  if (ext === 'fdx') {
    return { text: fdxToText(await file.text()), format: 'fdx' }
  }
  if (ext === 'pdf') {
    return { text: await pdfToText(file), format: 'pdf' }
  }
  if (ext === 'docx') {
    return { text: await docxToText(file), format: 'docx' }
  }
  if (ext === 'pages') {
    throw new Error('Pages files cannot be read directly. Export to PDF or Word (.docx) from Pages and upload that.')
  }
  throw new Error(`Unsupported file type ".${ext}". Use ${ACCEPTED}.`)
}

function fdxToText(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const paras = Array.from(doc.getElementsByTagName('Paragraph'))
  const lines = paras.map((p) => {
    const type = p.getAttribute('Type') || ''
    const text = Array.from(p.getElementsByTagName('Text')).map((t) => t.textContent).join('')
    if (type === 'Scene Heading' || type === 'Character') return '\n' + text.toUpperCase()
    if (type === 'Parenthetical') return text.startsWith('(') ? text : `(${text})`
    if (type === 'Transition') return '\n' + text
    return text
  })
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await pdfjs.getDocument({ data }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    // Rebuild lines from text items using their y position.
    let lastY = null
    let line = ''
    const lines = []
    for (const item of content.items) {
      const y = Math.round(item.transform[5])
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line.trimEnd())
        line = ''
      }
      line += item.str
      if (item.hasEOL) {
        lines.push(line.trimEnd())
        line = ''
      }
      lastY = y
    }
    if (line) lines.push(line.trimEnd())
    pages.push(lines.join('\n'))
  }
  if (!pages.join('').trim()) {
    throw new Error('This PDF has no text layer (probably a scan). Run OCR on it or upload a DOCX/TXT.')
  }
  return pages.join('\n\n').replace(/[ \t]+\n/g, '\n').trim()
}

async function docxToText(file) {
  const mammoth = await import('mammoth/mammoth.browser')
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
  return result.value.replace(/\n{3,}/g, '\n\n').trim()
}
