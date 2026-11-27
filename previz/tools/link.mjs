// A link that opens Camera Previz with a scene: node previz/tools/link.mjs scene.json
// scene.json is the JSON of previz/src/examples.ts (figures, props, camera, notes).
import { readFileSync } from 'node:fs'
const json = JSON.stringify(JSON.parse(readFileSync(process.argv[2], 'utf8')))
console.log('https://hub.themadlions.com/previz/#ai=' + Buffer.from(json, 'utf8').toString('base64url'))
