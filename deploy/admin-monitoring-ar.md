# تشغيل مركز مراقبة Admin في Production

## المسارات المضافة

| المسار | الوظيفة | الحماية |
|---|---|---|
| `/api/v1/admin/system/monitoring` | Snapshot شامل للتطبيق وقاعدة البيانات والـMigrations وSSE والـDeploy والتنبيهات والأعداد التشغيلية | `auth:sanctum` + `system.monitor.view` |
| `/api/v1/admin/system/health` | Health Check مركزية ترجع 200 عند سلامة DB والـMigrations وسلامة حقول التتبع، و503 عند وجود عطل حرج | `auth:sanctum` + `system.monitor.view` |
| `/api/v1/admin/system/alerts` | التنبيهات الناتجة من آخر فحص | `auth:sanctum` + `system.monitor.view` |
| `/api/v1/admin/system/audit-log` | آخر 100 حدث من `system_events` مع الفاعل والكيان | `auth:sanctum` + `system.monitor.view` |

صفحة React الجديدة هي `/admin/system-monitor`، وتعمل فحصًا تلقائيًا كل 30 ثانية، إضافة إلى زر فحص يدوي. الصفحة متاحة لدور Admin فقط، وتظل بيانات المراقبة للقراءة فقط.

## المتغيرات الاختيارية لبيانات الإصدار

أضف المتغيرات التالية في Environment Variables الخاصة بخدمة Laravel على Render:

```env
APP_VERSION=2026.08.17.1
APP_COMMIT=ضع-رقم-Commit-الحالي-هنا
APP_DEPLOYED_AT=2026-08-17T12:00:00+03:00
```

إذا لم تُضف هذه المتغيرات، ستظهر الصفحة أن بيانات الإصدار **غير مربوطة**. هذا تحذير معلوماتي وليس عطلًا في التطبيق.

يمكن تحديث `APP_VERSION` و`APP_COMMIT` مع كل Deploy يدويًا في البداية. لاحقًا يمكن ربطهما بخط أنابيب النشر أو Webhook، بشرط عدم وضع أي Token سري داخل React أو قاعدة البيانات.

## إعدادات Cloudflare المطلوبة

يجب أن يظل Cloudflare طبقة DNS وSSL وCDN للملفات العامة فقط، ولا يصبح مخزنًا لبيانات النظام.

| المسار | الإعداد المطلوب |
|---|---|
| `/api/*` | Bypass Cache أو عدم إنشاء Cache Rule له |
| `/api/v1/notifications/stream` | عدم التخزين المؤقت، والسماح بتمرير اتصال SSE مباشرة إلى Render |
| أي endpoint يحتوي `auth:sanctum` | عدم التخزين المؤقت للاستجابة |
| ملفات React الثابتة | يمكن تخزينها مؤقتًا عند الحاجة مع إعادة نشر versioned assets |
| `Authorization` وCookies | تمريرهما إلى الأصل وعدم حذفهما من الطلب |
| SSL | استخدام HTTPS بين المستخدم وCloudflare وبين Cloudflare وRender |

يجب اختبار النظام وهو يعمل بدون أي Cache؛ إذا كان النظام يتوقف عند تعطيل Cache فهناك خطأ في الاعتماد على Cloudflare وليس في تصميم صحيح للتطبيق.

## ما يظهر في الصفحة فعليًا

تعرض الصفحة حالة اتصال قاعدة البيانات وزمن استجابة Query بسيط، عدد الـMigrations المطبقة والمعلقة، حالة مسار SSE وآخر System Event، حالة سلامة `item_reference` و`region`، عدد Failed Jobs، حالة بيانات الإصدار، توزيع حالات PR وPO، التنبيهات المفتوحة، وأعداد السجلات الرئيسية.

عدد اتصالات SSE الحالية وP95 latency التفصيلي لا يظهران كأرقام مصطنعة. يعرض النظام ملاحظة بأن Telemetry الإضافية مطلوبة إذا لم يتم ربط طبقة قياس حقيقية.

## اختبارات ما بعد النشر

بعد كل Deploy، نفذ بالترتيب:

```bash
php artisan migrate --force
php artisan test --compact --no-ansi
```

ثم افتح:

```text
https://DOMAIN/admin/system-monitor
```

وتحقق من أن:

1. حالة التطبيق وقاعدة البيانات تظهران «سليم» و«متصلة».
2. عدد الـMigrations المعلقة يساوي صفرًا.
3. عدد البنود الناقصة في `item_reference` و`region` يساوي صفرًا.
4. صفحة الإشعارات ما زالت تعمل بدون Refresh.
5. `APP_COMMIT` و`APP_VERSION` يظهران إذا تم تعريفهما.
6. طلبات API المصادق عليها لا تأتي من Cache قديم.
7. مستخدم غير Admin يحصل على 403 عند محاولة الوصول إلى المسارات الجديدة.

## إجراءات الأمان

لا تعرض صفحة المراقبة Stack Trace أو كلمات المرور أو محتوى `.env`. أي توسعة مستقبلية لعرض Logs تفصيلية يجب أن تستخدم صلاحية منفصلة مثل `system.logs.view` وتخفي القيم السرية. لا تضف زر Rollback أو حذف بيانات داخل Admin في المرحلة الأولى؛ هذه العمليات يجب أن تظل داخل منصة النشر وبعد مراجعة بشرية.
