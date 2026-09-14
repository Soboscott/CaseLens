import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

type Props = { src: string }
type Point = { x: number; y: number }
type Mode = 'redact' | 'callout'

type Mark =
  | {
      kind: 'redact'
      x: number
      y: number
      width: number
      height: number
    }
  | {
      kind: 'callout'
      x: number
      y: number
      radius: number
      number: number
    }

type Selection = {
  start: Point
  end: Point
  pointerId: number
}

function rectangle(
  start: Point,
  end: Point,
): Extract<Mark, { kind: 'redact' }> {
  const x = Math.floor(Math.min(start.x, end.x))
  const y = Math.floor(Math.min(start.y, end.y))

  return {
    kind: 'redact',
    x,
    y,
    width: Math.ceil(Math.max(start.x, end.x)) - x,
    height: Math.ceil(Math.max(start.y, end.y)) - y,
  }
}

function paint(
  canvas: HTMLCanvasElement,
  picture: HTMLImageElement,
  marks: Mark[],
  selection?: Selection | null,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(picture, 0, 0)

  // Draw callouts first so redactions always cover sensitive areas.
  for (const mark of marks) {
    if (mark.kind !== 'callout') continue

    ctx.save()
    ctx.beginPath()
    ctx.arc(mark.x, mark.y, mark.radius, 0, Math.PI * 2)
    ctx.fillStyle = '#123B6D'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = mark.radius / 8
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = `bold ${mark.radius}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      String(mark.number),
      mark.x,
      mark.y,
      mark.radius * 1.5,
    )
    ctx.restore()
  }

  ctx.fillStyle = '#000000'
  for (const mark of marks) {
    if (mark.kind === 'redact') {
      ctx.fillRect(mark.x, mark.y, mark.width, mark.height)
    }
  }

  if (selection) {
    const box = rectangle(selection.start, selection.end)
    const scale =
      canvas.width /
      (canvas.getBoundingClientRect().width || canvas.width)

    ctx.save()
    ctx.fillStyle = 'rgba(37, 99, 235, 0.25)'
    ctx.fillRect(box.x, box.y, box.width, box.height)
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2 * scale
    ctx.setLineDash([6 * scale, 4 * scale])
    ctx.strokeRect(box.x, box.y, box.width, box.height)
    ctx.restore()
  }

  return true
}

export default function RedactionCanvas({ src }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pictureRef = useRef<HTMLImageElement | null>(null)
  const marksRef = useRef<Mark[]>([])
  const selectionRef = useRef<Selection | null>(null)

  const [ready, setReady] = useState(false)
  const [mode, setMode] = useState<Mode>('redact')
  const [counts, setCounts] = useState({
    redactions: 0,
    callouts: 0,
  })
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState('Loading image…')

  useEffect(() => {
    let cancelled = false

    setReady(false)
    setMode('redact')
    setCounts({ redactions: 0, callouts: 0 })
    setDragging(false)
    setMessage('Loading image…')

    pictureRef.current = null
    marksRef.current = []
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
        'Drag to redact. Release to apply, or press Escape to cancel.',
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
        marksRef.current,
        selectionRef.current,
      )
    }
  }

  function updateCounts() {
    setCounts({
      redactions: marksRef.current.filter(
        mark => mark.kind === 'redact',
      ).length,
      callouts: marksRef.current.filter(
        mark => mark.kind === 'callout',
      ).length,
    })
  }

  function point(event: PointerEvent<HTMLCanvasElement>): Point {
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
    setMessage('Selection cancelled.')
  }

  function changeMode(next: Mode) {
    cancelSelection()
    setMode(next)
    setMessage(
      next === 'redact'
        ? 'Drag to redact. Release to apply, or press Escape to cancel.'
        : 'Click to add the next numbered callout. Place it beside the area you want to explain.',
    )
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (
      !ready ||
      !pictureRef.current ||
      !event.isPrimary ||
      event.button !== 0 ||
      selectionRef.current
    ) return

    event.preventDefault()
    event.currentTarget.focus({ preventScroll: true })

    const position = point(event)

    if (mode === 'callout') {
      const canvas = event.currentTarget
      const scale =
        canvas.width / canvas.getBoundingClientRect().width

      const radius = Math.min(
        16 * scale,
        canvas.width / 4,
        canvas.height / 4,
      )
      const inset = radius * 1.1
      const number = marksRef.current.filter(
        mark => mark.kind === 'callout',
      ).length + 1

      marksRef.current.push({
        kind: 'callout',
        x: Math.max(
          inset,
          Math.min(canvas.width - inset, position.x),
        ),
        y: Math.max(
          inset,
          Math.min(canvas.height - inset, position.y),
        ),
        radius,
        number,
      })

      updateCounts()
      redraw()
      setMessage(
        `Callout ${number} added. Click to add another, or choose Redact.`,
      )
      return
    }

    selectionRef.current = {
      start: position,
      end: position,
      pointerId: event.pointerId,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    redraw()
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    const selection = selectionRef.current
    if (!selection || selection.pointerId !== event.pointerId) return

    selection.end = point(event)
    redraw()
  }

  function finish(event: PointerEvent<HTMLCanvasElement>) {
    const selection = selectionRef.current
    if (!selection || selection.pointerId !== event.pointerId) return

    const end = point(event)
    const valid =
      Math.abs(end.x - selection.start.x) >= 2 &&
      Math.abs(end.y - selection.start.y) >= 2

    if (valid) {
      marksRef.current.push(rectangle(selection.start, end))
      updateCounts()
    }

    endSelection()
    redraw()
    setMessage(
      valid ? 'Redaction added.' : 'Drag a larger area to redact.',
    )
  }

  function undo() {
    if (!ready || selectionRef.current) return

    const removed = marksRef.current.pop()
    if (!removed) return

    updateCounts()
    redraw()
    setMessage(
      removed.kind === 'callout'
        ? 'Last callout removed.'
        : 'Last redaction removed.',
    )
  }

  function download() {
    const picture = pictureRef.current
    if (!ready || !picture || selectionRef.current) return

    const output = document.createElement('canvas')
    output.width = picture.naturalWidth
    output.height = picture.naturalHeight

    if (!paint(output, picture, marksRef.current)) {
      setMessage('Download failed. Please try again.')
      return
    }

    output.toBlob(blob => {
      if (!blob) {
        setMessage('Download failed. Please try again.')
        return
      }

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'caselens-annotated.png'
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
        <div
          role="group"
          aria-label="Editing tools"
          style={{ display: 'flex', gap: 8 }}
        >
          <button
            className={
              mode === 'redact'
                ? 'primary-button'
                : 'secondary-button'
            }
            aria-pressed={mode === 'redact'}
            disabled={!ready}
            onClick={() => changeMode('redact')}
          >
            Redact
          </button>

          <button
            className={
              mode === 'callout'
                ? 'primary-button'
                : 'secondary-button'
            }
            aria-pressed={mode === 'callout'}
            disabled={!ready}
            onClick={() => changeMode('callout')}
          >
            Add callout
          </button>
        </div>

        <span>
          {counts.redactions}{' '}
          {counts.redactions === 1 ? 'redaction' : 'redactions'}
          {' · '}
          {counts.callouts}{' '}
          {counts.callouts === 1 ? 'callout' : 'callouts'}
        </span>

        <button
          className="secondary-button"
          onClick={undo}
          disabled={
            !ready ||
            dragging ||
            counts.redactions + counts.callouts === 0
          }
        >
          Undo last action
        </button>

        <button
          className="secondary-button"
          onClick={download}
          disabled={!ready || dragging}
        >
          Download PNG
        </button>

        <p
          role="status"
          style={{ flexBasis: '100%', margin: 0 }}
        >
          {message}
        </p>
      </div>

      <div className="image-stage">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={event => {
            if (selectionRef.current?.pointerId === event.pointerId) {
              cancelSelection()
            }
          }}
          onLostPointerCapture={event => {
            if (selectionRef.current?.pointerId === event.pointerId) {
              cancelSelection()
            }
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault()
              cancelSelection()
            }
          }}
          onBlur={cancelSelection}
          aria-label={
            mode === 'redact'
              ? 'Screenshot editor. Drag to redact; Escape cancels selection.'
              : 'Screenshot editor. Click to add a numbered callout.'
          }
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
