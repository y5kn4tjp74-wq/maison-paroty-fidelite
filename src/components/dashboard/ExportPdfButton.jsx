import { useState } from 'react'

export default function ExportPdfButton({ targetRef, filename = 'maison-paroty-dashboard.pdf' }) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!targetRef.current) return
    setExporting(true)
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#fbf7f0',
        scale: 2,
      })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
      pdf.save(filename)
    } catch (err) {
      console.error('PDF export failed', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="inline-flex items-center gap-2 rounded-full border border-paroty-300 bg-white px-4 py-2 text-sm font-medium text-paroty-700 transition-colors hover:border-paroty-500 hover:text-paroty-900 disabled:opacity-50"
    >
      {exporting ? 'Export en cours…' : '📄 Exporter en PDF'}
    </button>
  )
}
