const { chromium } = require('playwright'); const fs = require('fs'), path = require('path')
const SITE = '/home/user/themadlions-projects/public/site/'
// which drawing goes to which file of the site
const MAP = [
  ['roardinoapp', 'lab/icons/roardino.png', 192], ['roardino', 'lab/icons/roardino-social.png', 192], ['roargrab', 'lab/icons/roargrab.png', 192], ['roarkit', 'lab/icons/roarkit.png', 192], ['roarlist', 'lab/icons/roarlist.png', 192],
  ['roarmail', 'lab/icons/roarmail.png', 192], ['roarme', 'lab/icons/roarme.png', 192], ['roarmind', 'lab/icons/roarmind.png', 192], ['roarmorph', 'lab/icons/roarmorph.png', 192], ['roarplay', 'lab/icons/roarplay.png', 192],
  ['roarstudio', 'lab/icons/roarstudio.png', 192], ['roartransfer', 'lab/icons/roartransfer.png', 192], ['roarmorph', 'lab/icons/roarverter.png', 192], ['roarwriter', 'lab/icons/roarwriter.png', 192],
  ['roarcast', 'lab/icons/roarcast.png', 192], ['roarref', 'lab/icons/roarref.png', 192],
  ['roarcast', 'lab/roarcast/icon.png', 512], ['roardinoapp', 'lab/roardino/icon.png', 512], ['roarkit', 'lab/roarkit/icon.png', 512], ['roarlist', 'lab/roarlist/icon.png', 512], ['roarmail', 'lab/roarmail/icon.png', 512],
  ['roarmorph', 'lab/roarmorph/icon.png', 512], ['roarplay', 'lab/roarplay/icon.png', 512], ['roarref', 'lab/roarref/icon.png', 512], ['roarstudio', 'lab/roarstudio/icon.png', 512], ['roarkit', 'lab/roartwin/icon.png', 256],
  ['roarmorph', 'lab/roarverter/icon.png', 512], ['roarwriter', 'lab/roarwriter/icon.png', 512], ['roarme', 'roarme/icon.png', 512],
]
;(async () => { const b = await chromium.launch(); const p = await b.newPage()
  for (const [k, out, size] of MAP) {
    await p.setViewportSize({ width: size, height: size })
    await p.setContent(`<body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${fs.readFileSync(k + '.svg').toString('base64')}" width="${size}" height="${size}" style="display:block">`)
    await p.screenshot({ path: SITE + out, omitBackground: true }) }
  for (const [k, out] of [['roarcast', 'lab/roarcast/icon.svg'], ['roarref', 'lab/roarref/icon.svg'], ['roarstudio', 'lab/roarstudio/icon.svg'], ['roarwriter', 'lab/roarwriter/icon.svg']]) fs.copyFileSync(k + '.svg', SITE + out)
  await b.close(); console.log(MAP.length, 'pictures') })()
