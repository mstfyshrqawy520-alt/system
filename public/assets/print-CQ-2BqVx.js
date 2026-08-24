const l=(a=".print-container .print-document")=>{const r=document.querySelector(a);if(!r){window.print();return}const t=window.open("","_blank","width=960,height=720");if(!t){window.print();return}const m=Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(o=>o.outerHTML).join(`
`),p=r.cloneNode(!0);t.document.open(),t.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <base href="${document.baseURI}" />
    ${m}
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 0 !important; background: #fff !important; font-family: 'Cairo', 'Tajawal', 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif !important; direction: rtl !important; }
      body, body * { color: #000 !important; -webkit-text-fill-color: #000 !important; letter-spacing: normal !important; word-spacing: normal !important; line-height: 1.5 !important; word-break: normal !important; overflow-wrap: break-word !important; }
      .print-container { position: static !important; display: block !important; width: 100% !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; background: #fff !important; }
      .print-container > .print-target-document { display: block !important; width: 100% !important; height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; }
      .print-target-document { display: block !important; visibility: visible !important; }
      table { width: 100% !important; border-collapse: collapse !important; font-size: 11px !important; margin-top: 6px !important; }
      th, td { padding: 6px 8px !important; border: 1px solid #94a3b8 !important; line-height: 1.5 !important; vertical-align: middle !important; }
      th { background-color: #f1f5f9 !important; font-weight: 700 !important; text-align: center !important; }
    </style>
  </head>
  <body>
    <div class="print-container print-target-document">${p.outerHTML}</div>
  </body>
</html>`),t.document.close(),(async()=>{var i;const o=Array.from(t.document.images);await Promise.all(o.map(n=>n.complete?Promise.resolve():new Promise(e=>{n.addEventListener("load",()=>e(),{once:!0}),n.addEventListener("error",()=>e(),{once:!0})}))),(i=t.document.fonts)!=null&&i.ready&&await t.document.fonts.ready,t.addEventListener("afterprint",()=>t.close(),{once:!0}),t.focus(),t.print()})()};export{l as p};
