/**
 * Dedicated Print Helper for AI Studio Web Environment
 * Isolates the targeted print container so that the background webpage,
 * navigation bars, and modals are never printed.
 */

export function printIsolatedElement(
  element: HTMLElement | null, 
  title: string = 'พิมพ์เอกสาร', 
  isLandscape: boolean = false
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!element) {
      resolve(false);
      return;
    }

    try {
      // Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.top = '0';
      iframe.style.left = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.opacity = '0.01';
      iframe.style.pointerEvents = 'none';
      iframe.style.border = 'none';
      iframe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        // Fallback to standard window.print()
        window.print();
        resolve(true);
        return;
      }

      // Collect all active stylesheets and style tags
      let styleMarkup = '';
      const styles = document.querySelectorAll('link[rel="stylesheet"], style');
      styles.forEach(el => {
        styleMarkup += el.outerHTML;
      });

      // Clone target element
      const clonedElement = element.cloneNode(true) as HTMLElement;
      // Strip any unwanted classes that could restrict sizing in print
      clonedElement.style.margin = '0 auto';
      clonedElement.style.boxShadow = 'none';
      clonedElement.style.border = 'none';

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="th">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            ${styleMarkup}
            <style>
              @page {
                size: A4 ${isLandscape ? 'landscape' : 'portrait'};
                margin: ${isLandscape ? '0' : '6mm'};
              }
              *, *::before, *::after {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                width: 100% !important;
                height: 100% !important;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .no-print {
                display: none !important;
              }
              /* Print container isolation */
              #print-target-wrapper {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                display: block !important;
              }
            </style>
          </head>
          <body>
            <div id="print-target-wrapper">
              ${clonedElement.outerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      const triggerPrint = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print error, falling back:', e);
          window.print();
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve(true);
          }, 1500);
        }
      };

      // Wait for images inside iframe to load if any
      const iframeImages = iframeDoc.querySelectorAll('img');
      if (iframeImages.length === 0) {
        setTimeout(triggerPrint, 350);
      } else {
        let loaded = 0;
        const total = iframeImages.length;
        const checkDone = () => {
          loaded++;
          if (loaded >= total) triggerPrint();
        };
        iframeImages.forEach(img => {
          if (img.complete) {
            checkDone();
          } else {
            img.onload = checkDone;
            img.onerror = checkDone;
          }
        });
        // Safety timeout if images take too long
        setTimeout(triggerPrint, 1200);
      }
    } catch (err) {
      console.error('Print isolated element failed:', err);
      window.print();
      resolve(true);
    }
  });
}
