# دليل التشغيل والاختبارات قبل النشر

## النسخ الاحتياطي والاستعادة

تمت إضافة أمرين إلى Artisan:

```powershell
C:\php\php.exe artisan db:backup
C:\php\php.exe artisan db:restore "storage\app\backups\procurement_YYYYMMDD_HHMMSS.sqlite" --force
```

أمر `db:backup` ينشئ نسخة SQLite داخل `storage/app/backups`، ويمكن تمرير `--path` لتحديد مجلد آخر. أمر `db:restore` يرفض التنفيذ بدون `--force`، وينشئ نسخة أمان تلقائية من قاعدة البيانات الحالية قبل الاستبدال. لا تستخدم الاستعادة على بيئة الإنتاج إلا بعد إيقاف الكتابة والتأكد من الملف.

تم تنفيذ اختبار عملي معزول على نسخة مؤقتة، وكانت النتيجة `RESTORE_TEST_PASS`. لم يتم استبدال قاعدة بيانات التشغيل أثناء الاختبار.

## اختبار PostgreSQL

للاختبار على PostgreSQL، يجب استخدام قاعدة اختبار منفصلة، ثم ضبط المتغيرات التالية في جلسة التشغيل:

```powershell
$env:DB_CONNECTION = "pgsql"
$env:DB_HOST = "127.0.0.1"
$env:DB_PORT = "5432"
$env:DB_DATABASE = "ashbiliya_procurement_test"
$env:DB_USERNAME = "postgres"
$env:DB_PASSWORD = "ضع كلمة مرور قاعدة الاختبار فقط"
C:\php\php.exe artisan migrate:fresh --seed --force
C:\php\php.exe artisan test
```

لم يتم تشغيل PostgreSQL من داخل جلسة المشروع الحالية لأن خدمة PostgreSQL وبيانات اتصالها غير متاحة. هذا ليس تغييرًا في النظام، وإنما متطلب بيئي خارجي لاستكمال اختبار التوافق. يجب تشغيل الاختبار على قاعدة اختبار فقط وعدم استخدام قاعدة الإنتاج.

## بوابة قبول الإصدار

قبل النشر، يجب أن يمر `php artisan test` و`npm test -- --run` و`npm run build`، وأن تكون نتيجة `php artisan migrate:status` محدثة، وألا توجد محاولات وصول غير مصرح بها غير مفسرة في لوحة مراقبة النظام. لا يضيف أي من هذه الأوامر مرحلة جديدة إلى دورة الشراء.
