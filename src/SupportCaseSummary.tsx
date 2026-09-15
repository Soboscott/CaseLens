import { useRef, useState } from 'react'
import { ClipboardCopy, Download, FileText, Package } from 'lucide-react'
import { createCasePackage } from './casePackage'
import './SupportCaseSummary.css'

const fields = [
  { key: 'issue', label: 'Issue', placeholder: 'Example: Saving an application shows an error.', rows: 2 },
  { key: 'expected', label: 'Expected behavior', placeholder: 'What should happen?', rows: 3 },
  { key: 'actual', label: 'Actual behavior', placeholder: 'What happened instead? Include any error message and reference your numbered callouts.', rows: 3 },
  { key: 'steps', label: 'Steps to reproduce', placeholder: '1. Open the application\n2. Update a field\n3. Select Save', rows: 5 },
] as const

type FieldKey = typeof fields[number]['key']

type Props = {
  hasImage: boolean
  exportScreenshot: () => Promise<Blob>
}

export default function SupportCaseSummary({ hasImage, exportScreenshot }: Props) {
  const [values, setValues] = useState<Record<FieldKey, string>>({ issue: '', expected: '', actual: '', steps: '' })
  const [message, setMessage] = useState('')
  const [copying, setCopying] = useState(false)
  const [packaging, setPackaging] = useState(false)
  const packagingRef = useRef(false)
  const [manualCopy, setManualCopy] = useState(false)
  const previewRef = useRef<HTMLTextAreaElement>(null)
  const revisionRef = useRef(0)
  const hasContent = fields.some(({ key }) => values[key].trim())
  const summary = fields.map(({ key, label }) => `${label}\n${values[key].trim() || 'Not provided'}`).join('\n\n')

  function updateField(key: FieldKey, value: string) {
    revisionRef.current += 1
    setValues(current => ({ ...current, [key]: value }))
    setMessage('')
    setManualCopy(false)
  }

  function downloadSummary() {
    if (!hasContent) return
    setMessage('')
    let url: string | undefined
    const link = document.createElement('a')
    try {
      const file = new Blob([summary], { type: 'text/plain;charset=utf-8' })
      url = URL.createObjectURL(file)
      link.href = url
      link.download = 'caselens-support-summary.txt'
      document.body.appendChild(link)
      link.click()
      setMessage('Download requested: caselens-support-summary.txt. Your screenshot is exported separately.')
    } catch {
      setMessage('The download could not start. Try Copy summary to save the text manually.')
    } finally {
      link.remove()
      if (url) {
        const downloadUrl = url
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      }
    }
  }

  async function downloadPackage() {
    if (!hasImage || !hasContent || packagingRef.current) return
    packagingRef.current = true
    setPackaging(true)
    setManualCopy(false)
    setMessage('Preparing your case package…')
    const revision = revisionRef.current
    let url: string | undefined
    const link = document.createElement('a')
    try {
      // Capture the screenshot and summary as they were when Download was clicked.
      const screenshot = await exportScreenshot()
      const archive = await createCasePackage(screenshot, summary)
      url = URL.createObjectURL(archive)
      link.href = url
      link.download = 'caselens-case-package.zip'
      document.body.appendChild(link)
      link.click()
      if (revision === revisionRef.current) setMessage('Download requested: caselens-case-package.zip. It contains your edited screenshot and summary from when you clicked Download.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The case package could not be created. Please try again.')
    } finally {
      link.remove()
      if (url) {
        const downloadUrl = url
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60000)
      }
      packagingRef.current = false
      setPackaging(false)
    }
  }

  async function copySummary() {
    const revision = revisionRef.current
    setCopying(true)
    setMessage('')
    setManualCopy(false)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(summary)
      if (revision === revisionRef.current) setMessage('Summary copied. Paste it into your support ticket and attach the exported screenshot separately.')
    } catch {
      if (revision === revisionRef.current) {
        setManualCopy(true)
        setMessage('Automatic copy was blocked. Select the summary below and use Ctrl+C on Windows or Command+C on Mac.')
      }
    } finally {
      setCopying(false)
    }
  }

  return (
    <section className="case-summary" aria-labelledby="case-summary-title">
      <div className="case-summary-heading">
        <FileText size={23} aria-hidden="true" />
        <div>
          <h2 id="case-summary-title">Support-case summary</h2>
          <p>Add the context someone needs to understand and reproduce the issue.</p>
        </div>
      </div>
      <p className="case-summary-note" id="case-summary-help">Optional fields. Your draft stays in this page and clears when you refresh. Leave out sensitive customer information.</p>
      <div className="case-summary-fields">
        {fields.map(({ key, label, placeholder, rows }) => (
          <div className={`case-summary-field case-summary-field-${key}`} key={key}>
            <label htmlFor={`case-${key}`}>{label}</label>
            <textarea id={`case-${key}`} value={values[key]} onChange={event => updateField(key, event.target.value)} rows={rows} placeholder={placeholder} aria-describedby="case-summary-help" />
          </div>
        ))}
      </div>
      <div className="case-summary-actions">
        <button type="button" className="primary-button" disabled={!hasContent || copying || packaging} onClick={copySummary}>
          <ClipboardCopy size={17} aria-hidden="true" /> {copying ? 'Copying…' : 'Copy summary'}
        </button>
        <button type="button" className="secondary-button" disabled={!hasContent || copying || packaging} onClick={downloadSummary}>
          <Download size={17} aria-hidden="true" /> Download summary (.txt)
        </button>
        <button type="button" className="secondary-button" disabled={!hasImage || !hasContent || copying || packaging} onClick={downloadPackage} aria-describedby="case-package-help">
          <Package size={17} aria-hidden="true" /> {packaging ? 'Preparing ZIP…' : 'Download case package (.zip)'}
        </button>
        <span id="case-package-help">Add a screenshot and at least one summary field to download both together as a ZIP. Packaging happens in your browser.</span>
      </div>
      <p className="case-summary-status" role="status">{message}</p>
      {manualCopy && (
        <div className="case-summary-fallback">
          <label htmlFor="case-summary-copy">Summary to copy</label>
          <textarea id="case-summary-copy" ref={previewRef} readOnly value={summary} rows={12} />
          <button type="button" className="secondary-button" onClick={() => { previewRef.current?.focus(); previewRef.current?.select() }}>Select summary</button>
        </div>
      )}
    </section>
  )
}
