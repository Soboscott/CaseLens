import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'
import { Eye, ImagePlus, LockKeyhole, ShieldCheck, Sparkles, Upload } from 'lucide-react'

type ImageDetails = {
  file: File
  url: string
  width: number
  height: number
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024

function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState<ImageDetails | null>(null)
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image.url)
    }
  }, [image])

  const loadImage = (file?: File) => {
    setError('')
    if (!file) return
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Choose a PNG, JPG, or WebP image.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Choose an image smaller than 10 MB.')
      return
    }

    const url = URL.createObjectURL(file)
    const preview = new Image()
    preview.onload = () => {
      setImage((current) => {
        if (current) URL.revokeObjectURL(current.url)
        return { file, url, width: preview.naturalWidth, height: preview.naturalHeight }
      })
    }
    preview.onerror = () => {
      URL.revokeObjectURL(url)
      setError('That image could not be read.')
    }
    preview.src = url
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => loadImage(event.target.files?.[0])
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    loadImage(event.dataTransfer.files?.[0])
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="CaseLens home">
          <span className="brand-mark"><Eye size={20} strokeWidth={2.4} /></span>
          <span>CaseLens</span>
        </a>
        <span className="privacy-pill"><LockKeyhole size={14} /> Private by default</span>
      </header>

      <main id="top">
        <section className="hero">
          <div className="eyebrow"><Sparkles size={14} /> Visual support triage</div>
          <h1>Turn screenshots into<br /><em>clear, actionable cases.</em></h1>
          <p>Annotate issues, protect customer data, and create better support tickets—all without uploading screenshots to a server.</p>
        </section>

        <section className="workspace" aria-label="Screenshot workspace">
          {!image ? (
            <div
              className={`drop-zone ${isDragging ? 'is-dragging' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
            >
              <div className="upload-icon"><ImagePlus size={28} /></div>
              <h2>Drop in a support screenshot</h2>
              <p>or choose an image from your device</p>
              <button className="primary-button" onClick={() => inputRef.current?.click()}>
                <Upload size={17} /> Choose image
              </button>
              <span className="file-help">PNG, JPG, or WebP · Up to 10 MB</span>
              <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} hidden />
            </div>
          ) : (
            <div className="image-workspace">
              <div className="workspace-toolbar">
                <div>
                  <strong>{image.file.name}</strong>
                  <span>{image.width} × {image.height} · {(image.file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <button className="secondary-button" onClick={() => inputRef.current?.click()}>Replace image</button>
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onFileChange} hidden />
              </div>
              <div className="image-stage"><img src={image.url} alt="Uploaded support screenshot" /></div>
            </div>
          )}
          {error && <p className="error-message" role="alert">{error}</p>}
        </section>

        <section className="trust-note">
          <ShieldCheck size={21} />
          <div><strong>Your screenshot stays in your browser.</strong><span>CaseLens processes images locally and does not store customer data.</span></div>
        </section>
      </main>
    </div>
  )
}

export default App
