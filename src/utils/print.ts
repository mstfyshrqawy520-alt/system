export const printDocumentOnly = (selector = '.print-container .print-document'): void => {
  const sourceDocument = document.querySelector<HTMLElement>(selector);
  if (!sourceDocument) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=960,height=720');
  if (!printWindow) {
    window.print();
    return;
  }

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((style) => style.outerHTML)
    .join('\n');
  const clonedDocument = sourceDocument.cloneNode(true) as HTMLElement;

  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <base href="${document.baseURI}" />
    ${styles}
    <style>
      @page { size: A4 portrait; margin: 5mm; }
      html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 0 !important; background: #fff !important; }
      body { color: #000 !important; font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important; }
      .print-container { position: static !important; display: block !important; width: 100% !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; background: #fff !important; }
      .print-container > .print-target-document { display: block !important; width: 100% !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; }
      .print-target-document { display: block !important; visibility: visible !important; }
      .print-target-document, .print-target-document * { color: #000 !important; font-family: 'Cairo', 'Tajawal', Arial, sans-serif !important; font-weight: 800 !important; -webkit-text-fill-color: #000 !important; }
    </style>
  </head>
  <body>
    <div class="print-container print-target-document">${clonedDocument.outerHTML}</div>
  </body>
</html>`);
  printWindow.document.close();

  const printAfterResourcesLoad = async () => {
    const images = Array.from(printWindow.document.images);
    await Promise.all(images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }));

    if (printWindow.document.fonts?.ready) {
      await printWindow.document.fonts.ready;
    }

    printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
    printWindow.focus();
    printWindow.print();
  };

  void printAfterResourcesLoad();
};
