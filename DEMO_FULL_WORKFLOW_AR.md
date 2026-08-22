# بيانات تجريبية مترابطة لدورة المشتريات

أضيف Seeder باسم `DemoFullWorkflowSeeder` لإنشاء 13 سيناريو مترابطًا وقابلًا لإعادة التشغيل. كل سيناريو يستخدم أرقامًا تبدأ بـ`TEST-FULL-` حتى يمكن البحث عنه من الواجهة وتمييزه عن بيانات التشغيل.

## ما الذي يتم إنشاؤه؟

| البيانات | العدد | أمثلة |
|---|---:|---|
| طلبات شراء | 13 | `TEST-FULL-PR-001` إلى `TEST-FULL-PR-013` |
| عروض أسعار | 15 | ثلاثة عروض للسيناريوهات التي تغطي quote flow |
| ترشيحات عروض | 21 | ترشيحات مالية وقسمية حسب مسار السيناريو |
| أوامر شراء | 3 | `TEST-FULL-PO-011` إلى `TEST-FULL-PO-013` |
| إذونات استلام | 2 | `TEST-FULL-GRN-012` و`TEST-FULL-GRN-013` |
| فواتير موردين | 1 | `TEST-FULL-INV-013` مرتبطة بـPO وGRN |
| مدفوعات | 1 | `TEST-FULL-PAY-013` دفعة جزئية على حساب المورد |
| قطع أراضٍ للاختبار | 3 | رصيد افتتاحي وسجل حركة ومصروف الفاتورة |
| أحداث وإشعارات وأرشيف | مرتبطة بالسيناريوهات | لا توجد سجلات orphaned داخل المجموعة |

## التشغيل المحلي

تأكد أولًا من تشغيل migrations ووجود حسابات Demo والأدوار والموردين. إذا كان جدول الأصناف فارغًا، شغّل Seeder الكتالوج مرة واحدة:

```bash
php artisan db:seed --class=ConstructionMaterialsSeeder
```

بعد ذلك شغّل الـSeeder الكامل صراحةً:

```bash
php artisan db:seed --class=DemoFullWorkflowSeeder
```

لا تمت إضافة `DemoFullWorkflowSeeder` إلى `DatabaseSeeder` عمدًا؛ حتى لا تُنشأ بيانات الاختبار تلقائيًا في بيئة الإنتاج عند تشغيل `db:seed` العام.

## نقاط الدخول في الواجهة

| السيناريو | الحالة | المكان المتوقع |
|---|---|---|
| `TEST-FULL-PR-001` | `DRAFT` | طلبات الموظف / المسودات |
| `TEST-FULL-PR-002` | `SUBMITTED` | طابور المراجع |
| `TEST-FULL-PR-003` | `UNDER_REVIEW` | طلبات المراجع قيد المراجعة |
| `TEST-FULL-PR-004` | `PENDING_EXECUTIVE_APPROVAL` | طلبات القرار التنفيذي |
| `TEST-FULL-PR-005` | `PENDING_PROCUREMENT_APPROVAL` / `QUOTES` | مدير المشتريات |
| `TEST-FULL-PR-006` | `PENDING_QUOTE_RECOMMENDATIONS` | ترشيحات العروض للحسابات والقسم |
| `TEST-FULL-PR-007` | `PENDING_QUOTE_RECOMMENDATIONS` لطلب المدير التنفيذي | ترشيحات الحسابات فقط حسب مسار المدير التنفيذي |
| `TEST-FULL-PR-008` | `PENDING_EXECUTIVE_QUOTE_DECISION` | قرار المدير التنفيذي للعروض |
| `TEST-FULL-PR-009` | `APPROVED_BY_PROCUREMENT` | جاهز لإنشاء أمر شراء |
| `TEST-FULL-PR-010` | `PENDING_ACCOUNTING_APPROVAL` / `DIRECT` | طلبات الموافقة المالية المباشرة |
| `TEST-FULL-PR-011` | `APPROVED_BY_ACCOUNTING` مع PO | مدير المشتريات لإنشاء أو مراجعة PO |
| `TEST-FULL-PR-012` | PO `ISSUED` وGRN `PENDING_SITE_ENGINEER` | أمين المخزن ثم مهندس الموقع |
| `TEST-FULL-PR-013` | PO وGRN وفاتورة ودفعة جزئية | الحسابات، سجل الفواتير، وحساب المورد |

## إعادة التشغيل والتنظيف

يمكن تشغيل الأمر أكثر من مرة. قبل كل تشغيل يحذف الـSeeder السجلات التي تحمل prefixes `TEST-FULL-` أو marker `TEST-FULL-WORKFLOW` فقط، ثم يعيد إنشاءها. لا يستخدم `migrate:fresh` ولا `db:wipe` ولا يحذف طلبات أو فواتير غير مميزة بالـTEST.

التنظيف اليدوي ليس مطلوبًا عادةً، ويمكن تنفيذ عملية الإعادة الآمنة بنفس الأمر:

```bash
php artisan db:seed --class=DemoFullWorkflowSeeder
```

## التحقق من صحة الروابط

```bash
php artisan test --filter=DemoFullWorkflowSeederTest
php storage/demo-runtime/check-demo-full-results.php
```

في Windows PowerShell، استخدم:

```powershell
& .\php_bin\php.exe artisan test --filter=DemoFullWorkflowSeederTest
& .\php_bin\php.exe storage\demo-runtime\check-demo-full-results.php
```

الاختبار يتحقق من أن كل PO مرتبط بطلب وبنود، وكل GRN مرتبط بـPO وبنود، وكل فاتورة مرتبطة بـPO وGRN، وأن توزيع الفاتورة يساوي قيمتها، وأن الدفعة مرتبطة بالفاتورة، وأن إعادة التشغيل لا تضاعف العدد.

## ملاحظات السلامة

لا تشغّل هذا Seeder على قاعدة الإنتاج إلا إذا أردت صراحةً إضافة بيانات اختبار مميزة هناك. الأفضل استخدام قاعدة `procurement_demo` منفصلة أو نسخة محلية. لا يحتوي الـSeeder على كلمات مرور أو APP_KEY أو DSN، ولا يغيّر كلمات مرور حسابات Demo. كما أنه لا يضيف VAT أو Tax أو Discount؛ كل القيم المالية بالجنيه المصري فقط.
