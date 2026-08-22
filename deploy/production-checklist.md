# قائمة تجهيز Production — نظام مشتريات الإشبيليّة

## البنية المقترحة

يُنشر Frontend كملفات static من مجلد dist على نطاق مستقل مثل app.example.com، بينما يعمل Laravel API على api.example.com. يجب استخدام MySQL أو PostgreSQL في الإنتاج بدلاً من SQLite.

## خطوات الخادم

1. تثبيت PHP 8.2 أو أحدث مع PDO وMySQL أو PostgreSQL وMbstring وOpenSSL وXML وCtype وJSON وFileinfo وCurl وTokenizer.
2. تثبيت Composer وNode.js LTS وNginx وPHP-FPM، مع تفعيل HTTPS.
3. رفع المشروع بدون node_modules وبدون ملف .env من جهاز التطوير.
4. تنفيذ composer install --no-dev --prefer-dist --optimize-autoloader.
5. نسخ .env.production.example إلى .env وتعبئة بيانات قاعدة البيانات والنطاقات والأسرار الحقيقية.
6. تنفيذ php artisan key:generate --force مرة واحدة فقط إذا لم يتم إنشاء APP_KEY سابقاً.
7. تنفيذ php artisan migrate --force ثم php artisan storage:link.
8. تنفيذ php artisan optimize بعد اكتمال إعدادات البيئة.
9. جعل جذر الويب هو مجلد public فقط، وضبط صلاحيات storage وbootstrap/cache.
10. الإعداد الحالي يستخدم queue sync ولا يحتاج worker. إذا تم تحويله لاحقاً إلى database أو Redis queue، أضف migrations الخاصة بالـ jobs واضبط Supervisor قبل التفعيل.

## بناء Frontend

من مجلد المشروع: npm ci ثم تغيير VITE_API_BASE_URL إلى عنوان API الحقيقي ثم npm run build. يتم نشر محتويات dist على نطاق Frontend مع fallback إلى index.html.

## SSE

مسار الإشعارات اللحظية هو /api/v1/notifications/stream. يجب تعطيل buffering في Nginx لهذا المسار ورفع proxy read timeout وعدم استخدام cache له.

## الأمان

يجب أن يكون APP_DEBUG=false، وأن يكون ملف .env غير قابل للتحميل من الويب، وأن يحتوي CORS_ALLOWED_ORIGINS على نطاق Frontend الحقيقي فقط. لا تشغل DemoUserSeeder على قاعدة الإنتاج. فعّل HTTPS وخذ نسخة احتياطية يومية لقاعدة البيانات.

## التراجع

قبل كل migration أو release خذ نسخة من قاعدة البيانات واحتفظ بنسخة من build السابق. عند فشل الإصدار أعد dist السابق ثم راجع migration بشكل آمن.
