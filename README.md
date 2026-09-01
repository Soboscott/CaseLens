# CaseLens
CaseLens turns customer screenshots into clear, privacy-safe support cases. It is an image-processing portfolio project built around a real support operations problem: screenshots often contain the best evidence of an issue, but they can also expose sensitive information and arrive without enough context to act on.

Product vision

A support professional can upload or paste a screenshot, redact sensitive details, annotate the relevant interface elements, extract visible text, and export a structured case summary. Image processing happens locally in the browser by default.
Planned capabilities
Drag-and-drop and clipboard image input
Canvas-based annotation and numbered callouts
Destructive blur or solid-fill redaction
Browser-based OCR
Before-and-after image comparison
Structured support-ticket summary export
Accessible keyboard controls and responsive layout

Tech stack
React and TypeScript
Vite
Canvas API for image manipulation
Tesseract.js for local OCR (planned)
Vitest and Testing Library (planned)

Local development
npm install
npm run dev

Portfolio story
This project combines front-end development, image processing, privacy-conscious product design, and support-operations expertise. The roadmap is intentionally structured around an end-to-end customer support workflow rather than isolated image effects.
