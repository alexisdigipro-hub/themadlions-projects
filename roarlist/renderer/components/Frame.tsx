// A shot's frame: a reference still or a storyboard sketch. Drop a file on it, paste one, or click to choose.
import { useRef, useState } from 'react'
import { t } from '../i18n'
import { Icon } from './Icon'
import { Img } from './Img'

type Props = {
  projectId: string
  image: string
  ratio: number
  big?: boolean
  onImage: (file: Blob) => void
  onClear: () => void
}

const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes('Files')

export function Frame({ projectId, image, ratio, big, onImage, onClear }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div
      className={`frame${image ? ' has' : ''}${over ? ' over' : ''}${big ? ' big' : ''}`}
      style={{ aspectRatio: ratio }}
      title={image ? t.replaceImage : t.dropImage}
      onClick={() => input.current?.click()}
      onDragOver={(e) => { if (hasFiles(e)) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; setOver(true) } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (!hasFiles(e)) return
        e.preventDefault(); e.stopPropagation(); setOver(false)
        const f = e.dataTransfer.files[0]
        if (f) onImage(f)
      }}
    >
      {image
        ? <Img projectId={projectId} file={image} draggable={false} />
        : <span className="frame-empty"><Icon name="image" size={big ? 26 : 18} />{big && <small>{t.dropImage}</small>}</span>}
      {image && (
        <button className="frame-x" title={t.removeImage} onClick={(e) => { e.stopPropagation(); onClear() }}><Icon name="close" size={14} /></button>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onImage(f); e.target.value = '' }} />
    </div>
  )
}
