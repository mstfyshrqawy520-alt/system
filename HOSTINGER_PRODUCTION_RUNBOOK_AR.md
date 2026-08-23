# دليل النشر الآمن على Hostinger

## الهدف

هذا الدليل يشرح نشر نسخة `master` المعتمدة من نظام المشتريات على Hostinger بطريقة تدريجية، مع الحفاظ على قاعدة البيانات، الـworkflow، الصلاحيات، وإمكانية الرجوع إلى النسخة السابقة.

لا يتم استخدام بيانات Demo أو قاعدة `procurement_staging` في Production. يجب إنشاء قاعدة MySQL إنتاجية مستقلة، وعدم إرسال كلمات المرور داخل المحادثات أو تسجيلها في Git.

## 1. المتطلبات قبل الرفع

يجب تجهيز دومين أو Subdomain للـStaging، ثم قاعدة MySQL منفصلة على Hostinger، ثم قاعدة Production منفصلة. يفضل أن تكون نسخة Staging على نطاق مثل `staging.your-domain.com`، والنسخة النهائية على `your-domain.com`.

إصدار PHP المطلوب هو 8.2 أو أحدث ضمن الإصدارات المدعومة من Laravel 12، مع تفعيل الامتدادات التالية على الأقل: `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `xml`, `curl`, `zip`, `gd`, و`intl`.

يجب تفعيل SSL للدومين قبل اختبار تسجيل الدخول، لأن إعدادات الجلسة الإنتاجية تستخدم HTTPS وSecure Cookies.

## 2. إعداد ملف البيئة

يتم إنشاء `.env` على الخادم من نموذج `.env.production.example`، ثم تعديل القيم الفعلية فقط على Hostinger:

```env
APP_ENV=production
APP_DEBUG=false
APP_KEY=ضع_مفتاح_إنتاج_حقيقي_ولا_تغيره_بعد_بدء_التشغيل
APP_URL=https://your-domain.com

DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=3306
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

CORS_ALLOWED_ORIGINS=https://your-domain.com
SANCTUM_STATEFUL_DOMAINS=your-domain.com
SESSION_DRIVER=file
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
SESSION_DOMAIN=.your-domain.com

CACHE_STORE=file
QUEUE_CONNECTION=database
DEMO_LOGIN_PANEL=false
VITE_API_BASE_URL=/api/v1
```

إذا كان Web Push مطلوبًا، تضاف قيم Firebase Web App الحقيقية قبل بناء React، مع تقييد API key على دومين Staging وProduction. إذا لم تكن القيم جاهزة، يظل Web Push معطلًا بأمان بينما تعمل إشعارات Laravel الداخلية وSSE.

## 3. رفع الملفات

يتم رفع كود `master` المعتمد، وملف `vendor` الناتج من Composer، وملفات React النهائية داخل `public`. لا يتم رفع `.env` من Git، ولا `node_modules`، ولا مجلد قاعدة البيانات المحلية، ولا ملفات النسخ الاحتياطية إلى مكان متاح للويب.

في حال توفر SSH، شغّل داخل مجلد المشروع:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
php artisan storage:link
php artisan optimize:clear
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

يتم بناء React قبل الرفع من نسخة الكود المعتمدة:

```bash
npm ci
npm run test
npm run build
```

ثم تنسخ محتويات `dist` إلى `public` مع الاحتفاظ بملف `public/.htaccess` و`public/firebase-messaging-sw.js`.

## 4. إعداد Apache

إذا كان Document Root يشير إلى جذر المشروع، يجب الاحتفاظ بملف `.htaccess` الجذري الذي يوجه الطلبات إلى `public`. هذا الملف يمنع عرض `.env` و`.git` و`vendor` و`tests` وملفات Composer وVite.

إذا تم ضبط Document Root مباشرة على مجلد `public`، يستخدم Apache ملف `public/.htaccess` فقط، ويجب عدم جعل جذر المشروع قابلًا للتصفح.

## 5. Smoke Test بعد الرفع

نفذ الاختبارات التالية بالترتيب:

```bash
curl -I https://your-domain.com/login
curl -I https://your-domain.com/reviewer/requests
curl -I https://your-domain.com/procurement
curl -I https://your-domain.com/accounting
curl -I https://your-domain.com/api/v1/health
```

يجب أن تعيد المسارات الأساسية `200`، ويجب ألا تعرض `/api/v1/health` أي stack trace أو تفاصيل اتصال قاعدة البيانات.

بعد ذلك اختبر تسجيل الدخول بحساب اختبار محدود، ثم logout، ثم حاول فتح شاشة غير مسموحة لذلك الدور وتأكد من رفضها. لا تنشئ طلبات حقيقية قبل اكتمال Backup الأول.

## 6. اختبار التشغيل الوظيفي

على Staging Hostinger فقط، نفذ طلبًا تجريبيًا لمسار عروض الأسعار وطلبًا آخر لمسار الشراء المباشر. تحقق من إنشاء الطلب، مراجعة المراجع، اعتماد المدير التنفيذي، انتقال الطلب إلى المشتريات، تسجيل العرض أو البيانات المالية، إنشاء أمر الشراء، الاستلام، اعتماد مهندس الموقع، الفاتورة، المطابقة، والدفع.

بعد كل اعتماد، يجب التأكد من أن الدور السابق لا يستطيع تعديل رأس الطلب أو البنود. يجب كذلك اختبار الصلاحيات بين الموظف والمراجع والمشتريات والحسابات والمدير التنفيذي وأمين المخزن ومهندس الموقع.

## 7. Backup وRollback

قبل أي Migration أو تحويل للدومين:

1. خذ Backup كاملًا من قاعدة Production.
2. احفظ نسخة من ملفات الإصدار الحالي.
3. اختبر أن ملف Backup يمكن قراءته واستعادته إلى قاعدة اختبار منفصلة.
4. احتفظ برقم commit الإصدار السابق ورقم commit الإصدار الجديد.

عند ظهور خطأ، يوقف النشر أولًا، ثم يعاد Document Root أو release إلى النسخة السابقة، ثم يستعاد Backup فقط إذا حدث تغيير غير قابل للعكس في البيانات. لا يتم تشغيل `migrate:fresh` أو `db:wipe` على Production تحت أي ظرف.

## 8. Queue وCron والبريد

يجب التأكد من طريقة تشغيل Queue التي تسمح بها باقة Hostinger. إذا كانت الباقة لا تسمح بعملية Worker مستمرة، استخدم إعداد Queue مناسبًا للباقة واختبر الإشعارات غير المتزامنة. إذا كان Scheduler مستخدمًا، أضف Cron لتشغيل:

```bash
php /path/to/project/artisan schedule:run >> /dev/null 2>&1
```

يتم اختبار SMTP برسالة اختبارية، ثم التحقق من سجل Laravel دون كشف بيانات الدخول.

## 9. معايير قبول Production

لا يعتمد النشر إلا إذا تحققت الشروط التالية: `APP_DEBUG=false`، HTTPS فعال، `.env` غير قابل للتحميل، `/api/v1/health` ناجح، تسجيل الدخول يعمل، الصلاحيات صحيحة، refresh للمسارات الداخلية لا يعطي 404، قاعدة Production منفصلة، Backup قابل للاستعادة، Composer وnpm audit بلا ثغرات، والـworkflow الكامل ناجح على Staging.

بعد ذلك يتم تحويل المستخدمين تدريجيًا، ومراقبة `storage/logs` وhealth endpoint، وعدم تشغيل Seeders التجريبية أو تفعيل `DEMO_LOGIN_PANEL` في Production.
