import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

type Props = { src: string }
type Point = { x: number; y: number }
type Box = { x: number; y: number; width: number; height: number }
type Selection = { start: Point; end: Point; pointerId: number }

function boxBetween(start: Point, end: Point): Box {
  const x = Math.floor(Math.min(start.x, end.x))
  const y = Math.floor(Math.min(start.y, end.y))

  return {
    x,
    y,
    width: Math.ceil(Math.max(start.x, end.x)) - x,
    height: Math.ceil(Math.max(start.y, end.y)) - y,
  }
}

function paint(
  canvas: HTMLCanvasElement,
  picture: HTMLImageElement,
  boxes: Box[],
  selection?: Selection | null,
) {
  const context = canvas.getContext('2d')
  if (!context) return false

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(picture, 0, 0)

  context.fillStyle = '#000000'
  for (const box of boxes) {
    context.fillRect(box.x, box.y, box.width, box.height)
  }

  if (selection) {
    const box = boxBetween(selection.start, selection.end)
    const scale =
      canvas.width /
      (canvas.getBoundingClientRect().width || canvas.width)

    context.save()
    context.fillStyle = 'rgba(37, 99, 235, 0.25)'
    context.fillRect(box.x, box.y, box.width, box.height)
    context.strokeStyle = '#2563eb'
    context.lineWidth = 2 * scale
    context.setLineDash([6 * scale, 4 * scale])
    context.strokeRect(box.x, box.y, box.width, box.height)
    context.restore()
  }

  return true
}

export default function RedactionCanvas({ src }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pictureRef = useRef<HTMLImageElement | null>(null)
  const boxesRef = useRef<Box[]>([])
  const selectionRef = useRef<Selection | null>(null)

  const [ready, setReady] = useState(false)
  const [count, setCount] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('Loading image…')

  useEffect(() => {
    let cancelled = false

    setReady(false)
    setCount(0)
    setDragging(false)
    setMessage('Loading image…')

    pictureRef.current = null
    boxesRef.current = []
    selectionRef.current = null

    const canvas = canvasRef.current
    canvas?.getContext('2d')?.clearRect(
      0, 0, canvas.width, canvas.height,
    )

    const picture = new Image()

    picture.onload = () => {
      if (cancelled) return

      const canvas = canvasRef.current
      if (!canvas) return

      canvas.width = picture.naturalWidth
      canvas.height = picture.naturalHeight

      if (!paint(canvas, picture, [])) {
        setMessage('Unable to open the image editor.')
        return
      }

      pictureRef.current = picture
      setReady(true)
      setMessage(
        'Drag to select an area. Release to cover it. Press Escape to cancel.',
      )
    }

    picture.onerror = () => {
      if (!cancelled) {
        setMessage('Unable to load the image for editing.')
      }
    }

    picture.src = src

    return () => {
      cancelled = true
    }
  }, [src])

  function redraw() {
    if (canvasRef.current && pictureRef.current) {
      paint(
        canvasRef.current,
        pictureRef.current,
        boxesRef.current,
        selectionRef.current,
      )
    }
  }

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

  function endSelection() {
    const selection = selectionRef.current
    selectionRef.current = null
    setDragging(false)

    const canvas = canvasRef.current
    if (selection && canvas?.hasPointerCapture(selection.pointerId)) {
      canvas.releasePointerCapture(selection.pointerId)
    }
  }

  function cancelSelection() {
    if (!selectionRef.current) return

    endSelection()
    redraw()
    setMessage('Selection cancelled. Completed redactions are unchanged.')
  }

  function startRedaction(event: PointerEvent<HTMLCanvasElement>) {
    if (
      !ready ||
      !pictureRef.current ||
      !event.isPrimary ||
      event.button !== 0 ||
      selectionRef.current
    ) return

    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })

    const point = getPoint(event)
    selectionRef.current = {
      start: point,
      end: point,
      pointerId: event.pointerId,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    setMessage(
      'Release to cover the selected area, or press Escape to cancel.',
    )
    redraw()
  }

  function moveRedaction(event: PointerEvent<HTMLCanvasElement>) {
    const selection = selectionRef.current
    if (!selection || selection.pointerId !== event.pointerId) return

    selection.end = getPoint(event)
    redraw()
  }

  function finishRedaction(event: PointerEvent<HTMLCanvasElement>) {
    const selection = selectionRef.current
    if (!selection || selection.pointerId !== event.pointerId) return

    const end = getPoint(event)
    const valid =
      Math.abs(end.x - selection.start.x) >= 2 &&
      Math.abs(end.y - selection.start.y) >= 2

    if (valid) {
      boxesRef.current.push(boxBetween(selection.start, end))
      setCount(boxesRef.current.length)
    }

    endSelection()
    redraw()
    setMessage(
      valid
        ? 'Area covered. Add another redaction, undo, or download.'
        : 'Drag a larger area to create a redaction.',
    )
  }

  function undoRedaction() {
    if (
      !ready ||
      selectionRef.current ||
      boxesRef.current.length === 0
    ) return

    boxesRef.current.pop()
    setCount(boxesRef.current.length)
    redraw()
    setMessage('Last redaction removed.')
  }

  function downloadImage() {
    const picture = pictureRef.current
    if (!ready || !picture || selectionRef.current) return

    // Export completed redactions without the blue selection preview.
    const output = document.createElement('canvas')
    output.width = picture.naturalWidth
    output.height = picture.naturalHeight

    if (!paint(output, picture, boxesRef.current)) {
      setMessage('Download failed. Please try again.')
      return
    }

    output.toBlob((blob) => {
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
      <div
        className="workspace-toolbar"
        style={{ flexWrap: 'wrap', gap: 12 }}
      >
        <p role="status" style={{ flex: '1 1 240px' }}>
          {message}
        </p>

        <span>
          {count} {count === 1 ? 'redaction' : 'redactions'}
        </span>

        <button
          className="secondary-button"
          onClick={undoRedaction}
          disabled={!ready || dragging || count === 0}
        >
          Undo last redaction
        </button>

        <button
          className="secondary-button"
          onClick={downloadImage}
          disabled={!ready || dragging}
        >
          Download PNG
        </button>
      </div>

      <div className="image-stage">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onPointerDown={startRedaction}
          onPointerMove={moveRedaction}
          onPointerUp={finishRedaction}
          onPointerCancel={(event) => {
            if (selectionRef.current?.pointerId === event.pointerId) {
              cancelSelection()
            }
          }}
          onLostPointerCapture={(event) => {
            if (selectionRef.current?.pointerId === event.pointerId) {
              cancelSelection()
            }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              cancelSelection()
            }
          }}
          onBlur={cancelSelection}
          aria-label="Screenshot redaction area. Drag to select; Escape cancels selection."
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
