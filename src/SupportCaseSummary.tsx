import { useRef, useState } from 'react'
import { ClipboardCopy, FileText } from 'lucide-react'
import './SupportCaseSummary.css'

const fields = [
  { key: 'issue', label: 'Issue', placeholder: 'Example: Saving an application shows an error.', rows: 2 },
  { key: 'expected', label: 'Expected behavior', placeholder: 'What should happen?', rows: 3 },
  { key: 'actual', label: 'Actual behavior', placeholder: 'What happened instead? Include any error message and reference your numbered callouts.', rows: 3 },
  { key: 'steps', label: 'Steps to reproduce', placeholder: '1. Open the application\n2. Update a field\n3. Select Save', rows: 5 },
] as const

type FieldKey = typeof fields[number]['key']

export default function SupportCaseSummary() {
  const [values, setValues] = useState<Record<FieldKey, string>>({ issue: '', expected: '', actual: '', steps: '' })
  const [message, setMessage] = useState('')
  const [copying, setCopying] = useState(false)
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
        <button type="button" className="primary-button" disabled={!hasContent || copying} onClick={copySummary}>
          <ClipboardCopy size={17} aria-hidden="true" /> {copying ? 'Copying…' : 'Copy summary'}
        </button>
        <span>Paste the summary into your ticket and attach your exported screenshot.</span>
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
