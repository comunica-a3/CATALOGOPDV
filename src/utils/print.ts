/**
 * Centralized Print Utility for the application.
 * Handles printing of specific DOM elements, full pages, receipts, A4 documents,
 * with isolation, styles preservation, and reliable fallback for iframes.
 */

export function printElement(elementId: string, docTitle?: string): boolean {
  try {
    const targetEl = document.getElementById(elementId);
    if (!targetEl) {
      console.warn(`Print error: Element with ID "${elementId}" not found. Falling back to window.print()`);
      window.print();
      return false;
    }

    // Create a hidden iframe for clean, isolated printing
    const printFrameId = '__app_print_iframe__';
    let iframe = document.getElementById(printFrameId) as HTMLIFrameElement | null;
    
    if (iframe) {
      document.body.removeChild(iframe);
    }

    iframe = document.createElement('iframe');
    iframe.id = printFrameId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) {
      window.print();
      return false;
    }

    // Collect all head stylesheets and styles from the parent document
    let styleSheetsHTML = '';
    const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleElements.forEach((el) => {
      styleSheetsHTML += el.outerHTML;
    });

    // Specific print CSS
    const customPrintCSS = `
      <style>
        @page {
          margin: 5mm;
          size: auto;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 8px;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }
        .no-print, button, [role="button"] {
          display: none !important;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border-color: #cbd5e1;
        }
        @media print {
          body {
            padding: 0;
          }
          .page-break {
            page-break-before: always;
          }
        }
      </style>
    `;

    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${docTitle || 'Documento para Impressão'}</title>
          ${styleSheetsHTML}
          ${customPrintCSS}
        </head>
        <body>
          <div id="print-root">
            ${targetEl.outerHTML}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Trigger print after iframe renders styles
    setTimeout(() => {
      try {
        if (iframe?.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } else {
          window.print();
        }
      } catch (err) {
        console.error('Error invoking iframe print, falling back to window.print', err);
        window.print();
      }
    }, 250);

    return true;
  } catch (err) {
    console.error('Print utility failed', err);
    window.print();
    return false;
  }
}

export function triggerBrowserPrint(): void {
  try {
    window.print();
  } catch (err) {
    console.error('Error calling window.print()', err);
  }
}
