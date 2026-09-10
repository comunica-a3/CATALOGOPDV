import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Exports HTML document content directly to A4 PDF with high visual fidelity,
 * preserving fonts, font sizes, colors, alignments, line heights, lists, dividers and margins.
 */
export async function downloadDocumentAsPDF(title: string, htmlContent: string): Promise<void> {
  // Create an off-screen container matching the exact A4 paper dimensions and typography
  const container = document.createElement('div');
  container.className = 'a4-pdf-render-wrapper';
  container.style.position = 'fixed';
  container.style.top = '-99999px';
  container.style.left = '-99999px';
  container.style.width = '794px'; // Standard A4 width in pixels at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.fontFamily = 'Arial, "Helvetica Neue", Helvetica, sans-serif';
  container.style.fontSize = '12pt';
  container.style.lineHeight = '1.5';
  container.style.padding = '48px'; // ~20mm margin
  container.style.boxSizing = 'border-box';
  container.style.zIndex = '-1000';

  // Base styles to ensure HTML elements render cleanly
  container.innerHTML = `
    <style>
      .a4-pdf-render-wrapper * {
        box-sizing: border-box;
      }
      .a4-pdf-render-wrapper h1 {
        font-size: 20pt;
        font-weight: bold;
        margin-top: 0;
        margin-bottom: 12px;
        line-height: 1.25;
      }
      .a4-pdf-render-wrapper h2 {
        font-size: 16pt;
        font-weight: bold;
        margin-top: 16px;
        margin-bottom: 8px;
        line-height: 1.3;
      }
      .a4-pdf-render-wrapper h3 {
        font-size: 13pt;
        font-weight: bold;
        margin-top: 14px;
        margin-bottom: 6px;
        line-height: 1.35;
      }
      .a4-pdf-render-wrapper p {
        margin-top: 0;
        margin-bottom: 8px;
        line-height: 1.5;
      }
      .a4-pdf-render-wrapper hr {
        border: none;
        border-top: 1px solid #cbd5e1;
        margin: 14px 0;
      }
      .a4-pdf-render-wrapper ul, .a4-pdf-render-wrapper ol {
        margin-top: 4px;
        margin-bottom: 8px;
        padding-left: 24px;
      }
      .a4-pdf-render-wrapper li {
        margin-bottom: 4px;
      }
      .a4-pdf-render-wrapper .page-break {
        page-break-before: always;
        height: 1px;
        overflow: hidden;
        margin: 20px 0;
        visibility: hidden;
      }
    </style>
    <div class="a4-pdf-content">
      ${htmlContent}
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // 2x resolution for crisp print quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210; // mm
    const pageHeight = 297; // mm
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Subsequent pages if content overflows A4 height
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const sanitizedTitle = (title || 'documento')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
    const filename = `${sanitizedTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

    pdf.save(filename);
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
