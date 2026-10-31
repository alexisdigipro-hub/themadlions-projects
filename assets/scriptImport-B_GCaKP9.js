const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./mammoth.browser-B0tPQ06m.js","./client-TgjMUsKx.js"])))=>i.map(i=>d[i]);
import{aB as f}from"./main-eUKFJJhR.js";import"./client-TgjMUsKx.js";import"./supabase-kX2mygal.js";const x=".txt,.fountain,.fdx,.pdf,.docx";async function E(a){const t=a.name.toLowerCase().split(".").pop();if(t==="txt"||t==="fountain")return{text:await a.text(),format:t};if(t==="fdx")return{text:w(await a.text()),format:"fdx"};if(t==="pdf")return{text:await g(a),format:"pdf"};if(t==="docx")return{text:await _(a),format:"docx"};throw t==="pages"?new Error("Pages files cannot be read directly. Export to PDF or Word (.docx) from Pages and upload that."):new Error(`Unsupported file type ".${t}". Use ${x}.`)}function w(a){const o=new DOMParser().parseFromString(a,"application/xml");return Array.from(o.getElementsByTagName("Paragraph")).map(i=>{const e=i.getAttribute("Type")||"",r=Array.from(i.getElementsByTagName("Text")).map(u=>u.textContent).join("");return e==="Scene Heading"||e==="Character"?`
`+r.toUpperCase():e==="Parenthetical"?r.startsWith("(")?r:`(${r})`:e==="Transition"?`
`+r:r}).join(`
`).replace(/\n{3,}/g,`

`).trim()}async function g(a){const o=await f(()=>import("./pdf-BnPRJEQ6.js"),[],import.meta.url),t=(await f(async()=>{const{default:r}=await import("./pdf.worker.min-DgRcL-GR.js");return{default:r}},[],import.meta.url)).default;o.GlobalWorkerOptions.workerSrc=t;const s=new Uint8Array(await a.arrayBuffer()),i=await o.getDocument({data:s}).promise,e=[];for(let r=1;r<=i.numPages;r++){const d=await(await i.getPage(r)).getTextContent();let c=null,n="";const m=[];for(const p of d.items){const l=Math.round(p.transform[5]);c!==null&&Math.abs(l-c)>2&&(m.push(n.trimEnd()),n=""),n+=p.str,p.hasEOL&&(m.push(n.trimEnd()),n=""),c=l}n&&m.push(n.trimEnd()),e.push(m.join(`
`))}if(!e.join("").trim())throw new Error("This PDF has no text layer (probably a scan). Run OCR on it or upload a DOCX/TXT.");return e.join(`

`).replace(/[ \t]+\n/g,`
`).trim()}async function _(a){return(await(await f(()=>import("./mammoth.browser-B0tPQ06m.js").then(s=>s.m),__vite__mapDeps([0,1]),import.meta.url)).extractRawText({arrayBuffer:await a.arrayBuffer()})).value.replace(/\n{3,}/g,`

`).trim()}export{x as ACCEPTED,E as extractText};
