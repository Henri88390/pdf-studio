# Paperwork

A browser-based PDF editor built with Next.js. PDFs are processed locally in the
browser; the application does not upload documents to a server.

## Run locally

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open `http://localhost:3000`. To check the production build, run
`npm run lint`, `npm test`, and `npm run build`.

## Editing

Open a PDF, then use **Pen**, **Marker**, or **Add text**. Set the line width
in the toolbar for new or selected strokes, or choose a preset with a visual
preview. Choose colors using the toolbar swatches or the expanded palette.
Choose **Select** to edit text again or select a mark and delete it.
The text font and size controls apply to selected text or, when
no text is selected, to new text. Undo and redo are available in the toolbar.
Save PDF downloads a copy; it does not overwrite the original file. Unsaved
changes exist only in the open browser tab.
Use Ctrl + mouse wheel over the document area to zoom in or out.

Saved PDFs display annotations in ordinary PDF viewers. To keep them editable
in Paperwork, the saved PDF embeds a copy of the original PDF and the editing
data as attachments. Reopen the saved PDF in Paperwork to continue editing.
Other PDF tools may remove these attachments or flatten them, preventing later
editing in Paperwork. The original document's existing content is not editable
with this app. Embedded originals also increase file size and may retain
information that is visually covered by annotations: this app does **not**
provide secure redaction.

Added text offers ten bundled font families, including Roboto and Arimo, an
Arial-compatible alternative (not Arial itself). Latin, Greek, Cyrillic and
Vietnamese are supported; characters absent from the chosen font fall back to
Noto Sans where available, including Devanagari. Saving reports an error for
unsupported characters. Password-protected PDFs and OCR are not supported.

## Export and compression

Export PNG or JPEG either as a ZIP containing one image per page or as one
image with pages stacked vertically. Combined images have browser-safe size
limits; use separate page images for larger documents.

Compress PDF provides two lossless structural settings: Compact uses PDF object
streams and Standard does not. Neither recompresses images or promises a given
compression ratio; some PDFs will become larger. PDFs with editable
annotations include the original as an attachment, which can further increase
their size. Both options preserve Paperwork's editable annotations.
The compression dialog shows the size of the file that was opened and the
actual output sizes calculated from the current edits for both options. The
selected prepared PDF is downloaded as shown.
