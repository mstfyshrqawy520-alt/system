const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

// ---------------------------------------------------------
// 1. STATIC CODE ANALYSIS ENGINE
// ---------------------------------------------------------
function runStaticAnalysis() {
  console.log('--- Starting Static Code Analysis ---');
  const srcDir = path.resolve(__dirname, '../src');
  const results = {
    breakpointsUsed: new Set(),
    fixedWidthIssues: [],
    overflowRisks: [],
    tablesAudit: [],
    modalsAudit: [],
    touchTargetRisks: [],
    arabicTextAudit: [],
    mediaQueriesInCss: []
  };

  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (/\.(tsx|ts|css)$/.test(file)) {
        analyzeFile(fullPath, results);
      }
    }
  }

  function analyzeFile(filePath, res) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');

    // CSS Media queries
    if (filePath.endsWith('.css')) {
      const mqMatches = content.match(/@media[^{]+/g) || [];
      mqMatches.forEach(mq => res.mediaQueriesInCss.push({ file: relPath, query: mq.trim() }));
    }

    // Breakpoint classes: sm:, md:, lg:, xl:, 2xl:, min-[, max-[
    const bpMatches = content.match(/(sm|md|lg|xl|2xl|min-\[[^\]]+\]|max-\[[^\]]+\]):/g) || [];
    bpMatches.forEach(bp => res.breakpointsUsed.add(bp.replace(':', '')));

    // Fixed widths (e.g. w-[300px], min-w-[700px]) without mobile responsiveness
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;

      // Fixed width detection: w-[...px] or min-w-[...px] > 320px without responsive prefix
      const fixedWMatches = line.match(/(?<!(sm|md|lg|xl|2xl):)(min-w|w)-\[(\d+)px\]/g);
      if (fixedWMatches) {
        fixedWMatches.forEach(m => {
          const px = parseInt(m.match(/\d+/)[0], 10);
          if (px > 300) {
            res.fixedWidthIssues.push({
              file: relPath,
              line: lineNum,
              match: m,
              px,
              code: line.trim()
            });
          }
        });
      }

      // Check table elements
      if (/<table[\s>]/.test(line)) {
        res.tablesAudit.push({
          file: relPath,
          line: lineNum,
          hasMobileCardAlt: content.includes('md:table') || content.includes('hidden md:block') || content.includes('md:hidden') || content.includes('lg:table'),
          hasScrollWrapper: content.includes('overflow-x-auto') || content.includes('overflow-x-scroll')
        });
      }

      // Check Modal components
      if (relPath.includes('Modal') || relPath.includes('Dialog')) {
        // Look for max-height or overflow
      }

      // Arabic text issues: break-all on Arabic text
      if (line.includes('break-all') && !line.includes('break-words')) {
        res.arabicTextAudit.push({
          file: relPath,
          line: lineNum,
          issue: 'break-all may split Arabic words into isolated individual letters',
          code: line.trim()
        });
      }

      // Tiny buttons without min-h-11 or py on mobile
      if (line.includes('<button') && (line.includes('h-6 ') || line.includes('h-7 ') || line.includes('p-1 '))) {
        if (!line.includes('min-h-') && !line.includes('min-w-')) {
          res.touchTargetRisks.push({
            file: relPath,
            line: lineNum,
            code: line.trim()
          });
        }
      }
    });
  }

  walk(srcDir);
  results.breakpointsUsed = Array.from(results.breakpointsUsed);
  return results;
}

// ---------------------------------------------------------
// 2. HEADLESS PLAYWRIGHT DOM AUDIT ENGINE
// ---------------------------------------------------------
const VIEWPORTS = [
  // Mobile Portrait
  { name: 'iPhone SE (Portrait)', width: 320, height: 568, isMobile: true },
  { name: 'Modern Android (Portrait)', width: 360, height: 800, isMobile: true },
  { name: 'iPhone 13/14 (Portrait)', width: 390, height: 844, isMobile: true },
  { name: 'iPhone Pro Max (Portrait)', width: 430, height: 932, isMobile: true },
  // Mobile Landscape
  { name: 'iPhone SE (Landscape)', width: 568, height: 320, isMobile: true },
  { name: 'Modern Android (Landscape)', width: 800, height: 360, isMobile: true },
  { name: 'iPhone Pro Max (Landscape)', width: 932, height: 430, isMobile: true },
  // Tablet Portrait
  { name: 'Small Tablet (Portrait)', width: 600, height: 960, isMobile: true },
  { name: 'iPad Mini (Portrait)', width: 768, height: 1024, isMobile: true },
  { name: 'Android Tablet (Portrait)', width: 800, height: 1280, isMobile: true },
  // Tablet Landscape
  { name: 'Small Tablet (Landscape)', width: 960, height: 600, isMobile: false },
  { name: 'iPad (Landscape)', width: 1024, height: 768, isMobile: false },
  { name: 'Android Tablet (Landscape)', width: 1280, height: 800, isMobile: false },
  // Desktop / Laptop
  { name: 'HD Laptop', width: 1280, height: 720, isMobile: false },
  { name: 'MacBook Standard', width: 1440, height: 900, isMobile: false },
  { name: 'FHD Desktop', width: 1920, height: 1080, isMobile: false }
];

const ROLES = {
  admin: {
    id: 1,
    name: 'المهندس مصطفى (مدير النظام)',
    email: 'admin@ishbilia.dev',
    roles: [{ id: 1, name: 'Admin', slug: 'admin' }],
    permissions: [{ slug: 'admin.manage' }, { slug: 'purchase_request.view_all' }]
  },
  general_manager: {
    id: 2,
    name: 'المهندس محمد (المدير العام)',
    email: 'gm@ishbilia.dev',
    roles: [{ id: 2, name: 'General Manager', slug: 'general_manager' }],
    permissions: [{ slug: 'executive.approve' }, { slug: 'purchase_request.view_all' }]
  },
  employee: {
    id: 3,
    name: 'أحمد علي (مهندس موقع)',
    email: 'employee@ishbilia.dev',
    roles: [{ id: 3, name: 'Employee', slug: 'employee' }],
    permissions: [{ slug: 'purchase_request.create' }]
  },
  reviewer: {
    id: 4,
    name: 'محمد عبد الله (مراجع مشتريات)',
    email: 'reviewer@ishbilia.dev',
    roles: [{ id: 4, name: 'Reviewer', slug: 'reviewer' }],
    permissions: [{ slug: 'purchase_request.review' }]
  },
  accountant: {
    id: 5,
    name: 'عصام سالم (المدير المالي)',
    email: 'accountant@ishbilia.dev',
    roles: [{ id: 5, name: 'Accountant', slug: 'accountant' }],
    permissions: [{ slug: 'purchase_request.accounting_view' }, { slug: 'accounting.manage' }]
  },
  procurement_manager: {
    id: 6,
    name: 'عماد الدين (مدير المشتريات)',
    email: 'procurement@ishbilia.dev',
    roles: [{ id: 6, name: 'Procurement Manager', slug: 'procurement_manager' }],
    permissions: [{ slug: 'procurement.manage' }]
  }
};

const TEST_ROUTES = [
  { path: '/login', role: null, title: 'صفحة تسجيل الدخول' },
  { path: '/employee', role: 'employee', title: 'لوحة الموظف' },
  { path: '/requests', role: 'employee', title: 'قائمة طلبات الشراء' },
  { path: '/requests/create', role: 'employee', title: 'نموذج إنشاء طلب شراء' },
  { path: '/reviewer', role: 'reviewer', title: 'لوحة مراجع الطلبات' },
  { path: '/reviewer/requests', role: 'reviewer', title: 'طلبات المراجعة' },
  { path: '/general-manager', role: 'general_manager', title: 'لوحة المدير العام وAction Required' },
  { path: '/general-manager/purchase-requests', role: 'general_manager', title: 'طلبات القرار التنفيذي' },
  { path: '/general-manager/purchase-orders', role: 'general_manager', title: 'أوامر الشراء التنفيذية' },
  { path: '/accounting', role: 'accountant', title: 'لوحة المحاسبة والمالية' },
  { path: '/accounting/purchase-orders', role: 'accountant', title: 'أوامر الشراء للحسابات' },
  { path: '/procurement', role: 'procurement_manager', title: 'لوحة المشتريات' },
  { path: '/procurement/purchase-orders', role: 'procurement_manager', title: 'أوامر الشراء المشتريات' },
  { path: '/admin', role: 'admin', title: 'لوحة مدير النظام' },
  { path: '/admin/request-tracker', role: 'admin', title: 'مركز متابعة الطلبات الإداري' },
  { path: '/notifications', role: 'general_manager', title: 'مركز الإشعارات' },
  { path: '/my-archive', role: 'general_manager', title: 'أرشيف الإجراءات' },
  { path: '/profile', role: 'general_manager', title: 'الملف الشخصي' }
];

async function runHeadlessAudit() {
  console.log('--- Starting Headless Browser DOM Measurements ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const screenshotDir = path.resolve(__dirname, '../audit_screenshots');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);

  const measurements = [];
  const detectedIssues = [];

  // Mock API responses so pages render their full UI state
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    if (url.includes('/auth/me')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ROLES.general_manager)
      });
    } else if (url.includes('/notifications')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], unread_count: 0 })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            {
              id: 1,
              request_number: 'PR-2026-00001',
              status: 'PENDING_EXECUTIVE_APPROVAL',
              procurement_route: 'DIRECT',
              total_estimated_cost: 25000,
              created_at: '2026-09-13T10:00:00Z',
              requester: { name: 'أحمد علي' },
              department: { name: 'الموقع الميداني' },
              direct_supplier: { company_name: 'شركة النور للمقاولات' },
              items: [
                { id: 1, item_description: 'طوب اسمنتي مصمت 25*12*6', quantity: 2000, uom: 'ألف طوبة', estimated_unit_price: 12.5 }
              ]
            }
          ],
          meta: { current_page: 1, last_page: 1, total: 1 }
        })
      });
    }
  });

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    for (const r of TEST_ROUTES) {
      const roleObj = r.role ? ROLES[r.role] : null;

      // Set user session in localStorage before loading
      if (roleObj) {
        await page.addInitScript(({ user }) => {
          localStorage.setItem('al_ashbiliya_auth_token', 'mock-valid-token-12345');
          localStorage.setItem('al_ashbiliya_auth_user', JSON.stringify(user));
        }, { user: roleObj });
      } else {
        await page.addInitScript(() => {
          localStorage.removeItem('al_ashbiliya_auth_token');
          localStorage.removeItem('al_ashbiliya_auth_user');
        });
      }

      try {
        await page.goto(`http://localhost:4173${r.path}`, { waitUntil: 'domcontentloaded', timeout: 7000 });
        await page.waitForTimeout(300);

        // Gather deep DOM metrics
        const metrics = await page.evaluate((vpInfo) => {
          const docEl = document.documentElement;
          const body = document.body;

          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const clientW = Math.min(docEl.clientWidth, window.innerWidth);
          const scrollH = Math.max(docEl.scrollHeight, body.scrollHeight);
          const clientH = window.innerHeight;

          const hasHorizontalOverflow = scrollW > (clientW + 2); // 2px threshold for subpixel rounding

          // Check overflowing elements
          const overflowingElements = [];
          const allElements = document.querySelectorAll('main *, header *, nav *');
          for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            // In RTL, right should not exceed clientW, and left should not be negative, unless inside an intentional overflow container
            const isInsideScrollContainer = el.closest('.overflow-x-auto, .overflow-x-scroll, pre, code');
            if (!isInsideScrollContainer && rect.width > 0 && rect.height > 0) {
              if (rect.right > clientW + 4 || rect.left < -4) {
                overflowingElements.push({
                  tag: el.tagName.toLowerCase(),
                  className: el.className ? String(el.className).slice(0, 80) : '',
                  rect: { left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) }
                });
                if (overflowingElements.length >= 3) break;
              }
            }
          }

          // Check header & sidebar layout
          const header = document.querySelector('header');
          const headerH = header ? header.offsetHeight : 0;
          const sidebar = document.querySelector('aside');
          const sidebarW = sidebar ? sidebar.offsetWidth : 0;
          const sidebarDisplay = sidebar ? window.getComputedStyle(sidebar).display : 'none';

          // Check touch target heights (< 40px)
          const smallButtons = [];
          const buttons = document.querySelectorAll('button, a[role="button"], input[type="submit"]');
          buttons.forEach(btn => {
            const rect = btn.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && (rect.height < 36 || rect.width < 36)) {
              smallButtons.push({
                text: btn.innerText ? btn.innerText.trim().slice(0, 30) : 'icon',
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                class: String(btn.className).slice(0, 60)
              });
            }
          });

          return {
            scrollW,
            clientW,
            scrollH,
            clientH,
            hasHorizontalOverflow,
            overflowDelta: scrollW - clientW,
            overflowingElements,
            headerH,
            sidebarW,
            sidebarDisplay,
            smallButtonsCount: smallButtons.length,
            sampleSmallButtons: smallButtons.slice(0, 3)
          };
        }, vp);

        measurements.push({
          viewport: vp.name,
          dims: `${vp.width}x${vp.height}`,
          path: r.path,
          title: r.title,
          role: r.role || 'Public',
          ...metrics
        });

        if (metrics.hasHorizontalOverflow) {
          detectedIssues.push({
            type: 'HORIZONTAL_OVERFLOW',
            viewport: vp.name,
            dims: `${vp.width}x${vp.height}`,
            path: r.path,
            title: r.title,
            delta: metrics.overflowDelta,
            elements: metrics.overflowingElements
          });
        }

        // Take representative screenshots for key pages on mobile, tablet portrait, and desktop
        if (
          (vp.width === 360 && r.path === '/general-manager') ||
          (vp.width === 768 && r.path === '/general-manager') ||
          (vp.width === 1440 && r.path === '/general-manager') ||
          (vp.width === 360 && r.path === '/requests/create')
        ) {
          const shotName = `shot_${vp.width}_${r.path.replace(/\//g, '_')}.png`;
          await page.screenshot({ path: path.join(screenshotDir, shotName), fullPage: false });
        }

      } catch (err) {
        // Record navigation / rendering exception
        detectedIssues.push({
          type: 'PAGE_RENDER_ERROR',
          viewport: vp.name,
          dims: `${vp.width}x${vp.height}`,
          path: r.path,
          error: err.message
        });
      }
    }
  }

  await browser.close();
  return { measurements, detectedIssues };
}

// ---------------------------------------------------------
// 3. EXECUTE BOTH AND OUTPUT STRUCTURED REPORT
// ---------------------------------------------------------
async function main() {
  const staticResults = runStaticAnalysis();
  let headlessResults = { measurements: [], detectedIssues: [] };

  try {
    headlessResults = await runHeadlessAudit();
  } catch (e) {
    console.error('Headless run error:', e);
  }

  const reportData = {
    timestamp: new Date().toISOString(),
    staticAnalysis: staticResults,
    headlessAudit: headlessResults
  };

  fs.writeFileSync(
    path.resolve(__dirname, '../audit_results.json'),
    JSON.stringify(reportData, null, 2),
    'utf8'
  );

  console.log('--- Audit Completed Successfully ---');
  console.log(`Total Breakpoints Detected: ${staticResults.breakpointsUsed.length}`);
  console.log(`Total Media Queries in CSS: ${staticResults.mediaQueriesInCss.length}`);
  console.log(`Fixed Widths Flagged (>300px un-responsive): ${staticResults.fixedWidthIssues.length}`);
  console.log(`Headless Measurements Run: ${headlessResults.measurements.length}`);
  console.log(`Horizontal Overflows Detected: ${headlessResults.detectedIssues.filter(i => i.type === 'HORIZONTAL_OVERFLOW').length}`);
}

main().catch(console.error);
