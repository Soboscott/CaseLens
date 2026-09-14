import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

type Props = {
  src: string
}

type Point = {
  x: number
  y: number
}

export default function RedactionCanvas({ src }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const startRef = useRef<Point | null>(null)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState('Loading image…')

  useEffect(() => {
    let cancelled = false
    setReady(false)
    startRef.current = null

    const picture = new Image()

    picture.onload = () => {
      if (cancelled) return

      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (!canvas || !context) return

      canvas.width = picture.naturalWidth
      canvas.height = picture.naturalHeight
      context.drawImage(picture, 0, 0)

      setReady(true)
      setMessage('Drag over an area. A black box appears when you release.')
    }

    picture.onerror = () => {
      if (!cancelled) setMessage('Unable to load the image for editing.')
    }

    picture.src = src

    return () => {
      cancelled = true
    }
  }, [src])

  function getPoint(event: PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()

    return {
      x: Math.max(0, Math.min(
        canvas.width,
        (event.clientX - bounds.left) * canvas.width / bounds.width,
      )),
      y: Math.max(0, Math.min(
        canvas.height,
        (event.clientY - bounds.top) * canvas.height / bounds.height,
      )),
    }
  }

  function startRedaction(event: PointerEvent<HTMLCanvasElement>) {
    if (!ready || !event.isPrimary || event.button !== 0) return

    event.preventDefault()
    startRef.current = getPoint(event)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function finishRedaction(event: PointerEvent<HTMLCanvasElement>) {
    if (!event.isPrimary) return

    const start = startRef.current
    startRef.current = null
    if (!start) return

    const end = getPoint(event)
    const context = event.currentTarget.getContext('2d')
    if (!context) return

    if (Math.abs(end.x - start.x) < 2 ||
        Math.abs(end.y - start.y) < 2) return

    const left = Math.floor(Math.min(start.x, end.x))
    const top = Math.floor(Math.min(start.y, end.y))
    const right = Math.ceil(Math.max(start.x, end.x))
    const bottom = Math.ceil(Math.max(start.y, end.y))

    context.fillStyle = '#000000'
    context.fillRect(left, top, right - left, bottom - top)
    setMessage('Area covered. You can cover another area or download.')
  }

  function downloadImage() {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) {
        setMessage('Download failed. Please try again.')
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'caselens-redacted.png'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    }, 'image/png')
  }

  return (
    <div>
      <div className="workspace-toolbar">
        <p role="status">{message}</p>
        <button
          className="secondary-button"
          onClick={downloadImage}
          disabled={!ready}
        >
          Download PNG
        </button>
      </div>

      <div className="image-stage">
        <canvas
          ref={canvasRef}
          onPointerDown={startRedaction}
          onPointerUp={finishRedaction}
          onPointerCancel={() => { startRef.current = null }}
          onLostPointerCapture={() => { startRef.current = null }}
          aria-label="Screenshot redaction area"
          style={{
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            cursor: ready ? 'crosshair' : 'wait',
            touchAction: 'none',
          }}
        />
      </div>
    </div>
  )
}
