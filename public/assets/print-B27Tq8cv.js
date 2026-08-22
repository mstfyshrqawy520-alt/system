const s=(a=".print-container .print-document")=>{const r=document.querySelector(a);if(!r){window.print();return}const t=window.open("","_blank","width=960,height=720");if(!t){window.print();return}const m=Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(n=>n.outerHTML).join(`
`),p=r.cloneNode(!0);t.document.open(),t.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <base href="${document.baseURI}" />
    ${m}
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
    <div class="print-container print-target-document">${p.outerHTML}</div>
  </body>
</html>`),t.document.close(),(async()=>{var e;const n=Array.from(t.document.images);await Promise.all(n.map(o=>o.complete?Promise.resolve():new Promise(i=>{o.addEventListener("load",()=>i(),{once:!0}),o.addEventListener("error",()=>i(),{once:!0})}))),(e=t.document.fonts)!=null&&e.ready&&await t.document.fonts.ready,t.addEventListener("afterprint",()=>t.close(),{once:!0}),t.focus(),t.print()})()};export{s as p};
