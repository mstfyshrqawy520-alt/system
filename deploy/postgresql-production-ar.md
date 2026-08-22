# تشغيل PostgreSQL في Production — نظام مشتريات الإشبيليّة

## الحالة الحالية

بيئة Pilot المحلية تستمر باستخدام SQLite في ملف `database/database.sqlite`. تم اعتماد PostgreSQL كقاعدة Production، وتم تحديث `.env.example` ليستخدم اتصال `pgsql`. لم يتم تغيير دورة المشتريات أو الأدوار أو الصلاحيات أو انتقالات الحالات.

## متطلبات الخادم

يحتاج خادم Production إلى PHP 8.2 أو أحدث مع امتداد `pdo_pgsql`، وPostgreSQL 14 أو أحدث، وNginx وPHP-FPM. يجب أن تكون قاعدة البيانات على خادم خاص أو خدمة PostgreSQL مُدارة، ولا تُستخدم Cloudflare كقاعدة بيانات.

## إنشاء مستخدم وقاعدة البيانات

ينفذ مسؤول الخادم الأوامر التالية بحساب PostgreSQL إداري، مع تغيير كلمة المرور إلى قيمة سرية قوية:

```sql
CREATE USER ashbiliya_app WITH PASSWORD 'CHANGE_THIS_SECRET';
CREATE DATABASE al_ashbiliya_procurement OWNER ashbiliya_app;
GRANT ALL PRIVILEGES ON DATABASE al_ashbiliya_procurement TO ashbiliya_app;
```

داخل قاعدة البيانات يتم التأكد من صلاحيات مخطط `public`:

```sql
\c al_ashbiliya_procurement
GRANT USAGE, CREATE ON SCHEMA public TO ashbiliya_app;
```

## متغيرات Laravel

يتم وضع القيم على الخادم فقط داخل `.env`، ولا تُرفع إلى Git:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.example.com

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=al_ashbiliya_procurement
DB_USERNAME=ashbiliya_app
DB_PASSWORD=CHANGE_THIS_SECRET
DB_CHARSET=utf8
DB_SSLMODE=require

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database

VITE_API_BASE_URL=https://api.example.com/api/v1
CORS_ALLOWED_ORIGINS=https://app.example.com
```

إذا كانت خدمة PostgreSQL على نفس الخادم ويمكن الاتصال بها محليًا، يمكن استخدام `DB_SSLMODE=prefer`. أما خدمة PostgreSQL المُدارة فيفضل استخدام `require` أو إعداد SSL الذي توفره الخدمة.

## قبل تشغيل النقل

يجب أخذ نسخة من قاعدة Pilot:

```text
database/database.sqlite
```

ولا يتم تعديل ملف SQLite الأصلي أثناء النقل. كما يجب حفظ أعداد السجلات الأساسية قبل النقل:

```text
users
departments
roles
permissions
items
suppliers
purchase_requests
purchase_request_items
purchase_orders
purchase_order_items
approval_history
audit_logs
notifications
system_events
```

## تشغيل البنية على PostgreSQL

بعد وضع `.env` الصحيح:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
php artisan config:clear
php artisan migrate --force
php artisan optimize
php artisan config:cache
php artisan route:cache
```

يجب التأكد من تشغيل امتداد PHP:

```bash
php -m | grep -i pgsql
```

والنتيجة المطلوبة أن يظهر:

```text
pdo_pgsql
pgsql
```

## نقل بيانات Pilot

لا يتم استخدام `migrate:fresh` على قاعدة Production بعد بدء العمل. المسار الآمن هو:

1. إنشاء قاعدة PostgreSQL فارغة.
2. تشغيل جميع Migrations.
3. نقل البيانات بترتيب يحافظ على الـForeign Keys.
4. إعادة بناء `system_events` من `approval_history` و`audit_logs` عند الحاجة.
5. مقارنة أعداد السجلات بين SQLite وPostgreSQL.
6. اختبار تسجيل الدخول ودورة شراء كاملة.
7. تحويل `DB_CONNECTION` إلى `pgsql` في نسخة التطبيق النهائية.

ترتيب نقل البيانات المقترح:

```text
departments
roles
permissions
users
role_user
permission_role
categories
items
suppliers
purchase_requests
purchase_request_items
purchase_orders
purchase_order_items
approval_history
audit_logs
notifications
attachments
personal_access_tokens
system_events
```

إذا كانت البيانات القديمة Demo فقط، يمكن بدل نقلها تشغيل Seeders على PostgreSQL في بيئة Staging، ثم إدخال بيانات Production الحقيقية بعد اعتماد الاختبار. لا يتم تشغيل `DemoUserSeeder` أو `SeedTwoHundredPurchaseOperationsSeeder` على Production الحقيقي.

## التحقق بعد النقل

يجب فحص ما يلي:

```text
تسجيل الدخول
إنشاء طلب شراء
اختيار المراجع
عزل المراجع حسب القسم
اعتماد المراجع
اعتماد مدير المشتريات
إنشاء PO
إصدار PO للحسابات
إشعار المدير العام
قراءة الإشعار Realtime عبر SSE
الطباعة
الفلاتر والتقارير
Timeline الأحداث
```

كما يجب مقارنة الإجمالي المالي وعدد الطلبات والأوامر والموردين قبل وبعد النقل. PostgreSQL لا يغير معادلات النظام؛ الحساب يظل:

```text
line_total = quantity × unit_price
grand_total = مجموع line_total
currency = EGP
```

ولا تتم إضافة Tax أو VAT أو Discount.

## توافق PostgreSQL الذي تم ضبطه في الكود

تم استبدال استعلام إحصاء الموردين الذي كان يقارن Boolean باستخدام:

```sql
is_active = 1
```

باستعلامات Eloquent متوافقة مع PostgreSQL:

```php
Supplier::query()->count();
Supplier::query()->where('is_active', true)->count();
```

ذلك يمنع خطأ PostgreSQL الناتج عن مقارنة عمود Boolean بالرقم `1`.

## Cloudflare وPostgreSQL

Cloudflare لا تتصل بقاعدة البيانات مباشرة. المسار يكون:

```text
المستخدم → Cloudflare → Nginx → Laravel → PostgreSQL
```

يجب عمل Bypass Cache لكل مسارات API، وبالأخص:

```text
/api/*
/api/v1/notifications/stream
```

ولا يتم تخزين ردود API المصادق عليها في Cloudflare.

## Rollback

قبل تحويل المرور إلى Production يجب الاحتفاظ بـ:

```text
نسخة SQLite الأصلية
نسخة PostgreSQL قبل إدخال البيانات
نسخة .env الإنتاجية في Secret Manager
نسخة من build الواجهة
```

إذا فشل الاختبار، يتم إعادة التطبيق إلى الإصدار السابق دون حذف PostgreSQL، ثم التحقيق في الفروقات قبل إعادة المحاولة.
