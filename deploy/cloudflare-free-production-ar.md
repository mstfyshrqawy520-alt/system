# نشر نظام مشتريات الإشبيليّة خلف Cloudflare Free

هذا الدليل يشرح الإعداد المقترح لنشر النظام في بيئة Production خلف Cloudflare Free. يفترض الدليل وجود خادم أصل مستقل يشغّل Laravel API وواجهة React، بينما تعمل Cloudflare كطبقة DNS وReverse Proxy وCDN وحماية. **Cloudflare ليست قاعدة بيانات للنظام**؛ جميع الطلبات والمستخدمين والإشعارات وأوامر الشراء تبقى داخل قاعدة بيانات التطبيق.

## 1. البنية المقترحة

استخدم نطاقين منفصلين لتقليل التعقيد:

| الاستخدام | النطاق المقترح | نوع DNS |
|---|---|---|
| واجهة React الثابتة | `app.example.com` | Proxied / Orange Cloud |
| Laravel API | `api.example.com` | Proxied / Orange Cloud |
| قاعدة البيانات | لا تنشئ لها سجل DNS عامًا | داخل شبكة الخادم فقط |
| البريد الإلكتروني | سجلات MX وSPF وDKIM | DNS Only عند الحاجة |

يجب أن يكون أصل الخادم غير مكشوف قدر الإمكان، وأن يسمح جدار الحماية باتصالات HTTP/HTTPS القادمة من عناوين Cloudflare فقط. إذا كان الخادم يدعم Cloudflare Tunnel، فهو خيار مجاني متاح لإخفاء عنوان الأصل بالكامل، لكنه يتطلب تشغيل `cloudflared` على الخادم.

## 2. إعداد DNS

أضف في Cloudflare DNS سجلّي `A` أو `AAAA` يشيران إلى عنوان الخادم:

```text
A     app     <ORIGIN_IP>     Proxied
A     api     <ORIGIN_IP>     Proxied
```

لا تضف سجلًا لقاعدة البيانات أو Redis أو PHP-FPM. راجع السجلات القديمة وDNS-only قبل التفعيل؛ أي سجل DNS-only يشير إلى عنوان الخادم قد يكشف الأصل ويتيح تجاوز Cloudflare.

بعد التأكد من أن النطاقين يعملان عبر Cloudflare، غيّر عنوان الأصل أو فعّل Cloudflare Tunnel إذا كان عنوان الخادم قد ظهر تاريخيًا في سجلات DNS.

## 3. SSL/TLS

من Cloudflare Dashboard ثم **SSL/TLS**:

1. اختر الوضع **Full (strict)**، وليس Flexible.
2. ثبّت شهادة صالحة على Nginx في الأصل لكل من `app.example.com` و`api.example.com`. يمكن استخدام Let’s Encrypt أو Cloudflare Origin Certificate.
3. فعّل **Always Use HTTPS**.
4. فعّل **Automatic HTTPS Rewrites** عند الحاجة.
5. اجعل Minimum TLS Version هو `TLS 1.2`.
6. لا تفعّل HSTS قبل التأكد من أن النطاقين وجميع النطاقات الفرعية المطلوبة تعمل دائمًا عبر HTTPS.
7. بعد التحقق، فعّل HSTS من Cloudflare أو من Nginx. إعداد المشروع الحالي يضيف HSTS فقط في Production وعند اتصال HTTPS.

## 4. قواعد الكاش

القاعدة الأساسية هي: **لا تستخدم Cache Everything على Laravel API**. جميع استجابات API الخاصة والمصادقة يجب أن تتجاوز الكاش، حتى لو طلب العميل `GET`.

أنشئ Cache Rule أولى باسم `Bypass private procurement API`:

```text
(http.host eq "api.example.com" and http.request.uri.path starts_with "/api/")
```

الإجراء: `Bypass cache`.

أنشئ قاعدة ثانية باسم `Bypass realtime notification stream`:

```text
(http.host eq "api.example.com" and http.request.uri.path eq "/api/v1/notifications/stream")
```

الإجراء: `Bypass cache`، مع إبقاء استجابة Laravel وNginx على `no-cache` و`X-Accel-Buffering: no`.

بالنسبة إلى واجهة React، اسمح بالكاش للأصول ذات الأسماء الموقعة بالـ hash مثل `assets/*.js` و`assets/*.css` وملفات الخطوط والصور. لا تجعل `index.html` ثابتًا لمدة طويلة؛ اجعله يعيد التحقق حتى تظهر الإصدارات الجديدة سريعًا. إعداد Nginx في هذا المشروع يطبّق ذلك، ويمكن ترك Cloudflare على احترام `Cache-Control` من الأصل.

لا تستخدم قاعدة كاش تعتمد على `Authorization` أو Cookies كوسيلة وحيدة لحماية البيانات الخاصة؛ يجب أن تكون قاعدة تجاوز API صريحة حسب Host وPath، كما أن Laravel يرسل `private, no-store` لاستجابات API.

## 5. الحماية على Cloudflare Free

فعّل الخصائص المجانية المتاحة في لوحة Cloudflare:

| الإعداد | القيمة المقترحة | الملاحظة |
|---|---|---|
| Proxy status | Proxied | يخفي عنوان الأصل ويضع CDN/DDoS أمام التطبيق |
| DDoS protection | Enabled / default | حماية تلقائية على طبقة الشبكة |
| Browser Integrity Check | On | مناسب للحركة العامة، راقب عدم تأثيره على API |
| Bot Fight Mode | On بعد الاختبار | لا تضع تحديات JavaScript على SSE أو API المصادق |
| Security Level | Medium أو High حسب النتائج | اختبر المستخدمين من الشبكات الداخلية |
| TLS 1.2 minimum | On | يمنع العملاء الضعفاء |
| Always Use HTTPS | On | يمنع الطلبات العامة عبر HTTP |

لا تستخدم تحدي Cloudflare على `/api/v1/notifications/stream`، ولا على كل `/api/*`؛ تحديات المتصفح قد تمنع Axios وEventSource من إكمال المصادقة. إذا احتجت تقليل محاولات تسجيل الدخول، استخدم Rate Limiting أو throttle في Laravel على مسار تسجيل الدخول، ثم اختبره من الواجهة.

## 6. حماية الخادم الأصلي

طبّق قواعد جدار الحماية التالية:

1. اسمح لـ TCP `443` من عناوين Cloudflare فقط إذا كان الأصل لا يحتاج استقبالًا مباشرًا.
2. حوّل `80` إلى `443` أو اسمح به فقط لتجديد Let’s Encrypt إذا لزم.
3. اسمح بـ SSH من عنوان الإدارة أو VPN فقط، وليس من الإنترنت كله.
4. لا تفتح منفذ MySQL أو PostgreSQL أو Redis للعامة.
5. ثبّت قائمة Cloudflare IP من الملف `deploy/nginx/cloudflare-real-ip.conf.example` داخل Nginx، وراجعها قبل كل تغيير كبير؛ قوائم Cloudflare قابلة للتحديث.
6. استخدم `CF-Connecting-IP` فقط بعد حصر الاتصالات القادمة إلى الأصل من Cloudflare. لا تثق بهذا الرأس إذا كان الأصل يقبل اتصالات عامة مباشرة.

## 7. المصادقة والجلسات

النظام الحالي يستخدم Bearer Token في Axios، لذلك يجب أن يمرّر Cloudflare رأس `Authorization` دون تعديل. في Production استخدم:

```env
CORS_ALLOWED_ORIGINS=https://app.example.com
SANCTUM_STATEFUL_DOMAINS=app.example.com
SESSION_SECURE_COOKIE=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax
TRUSTED_PROXIES=*
```

إذا استُخدمت مصادقة Sanctum المعتمدة على Cookies في المستقبل، يجب أن تكون الواجهة والـ API تحت نفس النطاق الأساسي وأن يكون `SESSION_DOMAIN=.example.com`. لا تستخدم `SESSION_SAME_SITE=none` إلا إذا كان هناك احتياج حقيقي، لأنه يتطلب Cookies آمنة ويزيد سطح التعقيد.

لا تضع `APP_KEY` أو مفاتيح قاعدة البيانات أو Bearer Tokens في React أو Cloudflare Workers أو Cache Rules. متغيرات `VITE_*` تصل إلى المتصفح، لذلك يجب أن تحتوي فقط على عنوان API العام واسم التطبيق.

## 8. SSE والإشعارات الفورية

مسار الإشعارات هو:

```text
/api/v1/notifications/stream
```

يجب أن يمر عبر Nginx بدون buffering أو cache، وأن يرسل Laravel heartbeat دوريًا أقل من مهلة الخمول المحتملة في طبقات البروكسي. لا تضف Worker أو Cache Rule يعيد كتابة أو يخزن هذا المسار. عند تعطيل Cloudflare caching سيستمر النظام في العمل لأن SSE يعتمد على اتصال origin مباشر وليس على CDN cache.

## 9. الرؤوس الأمنية من التطبيق

يضيف Laravel Middleware باسم `SetSecurityHeaders` الرؤوس الآتية:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

ويضيف `Cache-Control: private, no-store` لمسارات API. يجب الحفاظ على هذه الرؤوس في الأصل حتى لو تم تعطيل Cloudflare؛ الأمان لا يعتمد على CDN فقط.

## 10. ما بعد النشر

بعد رفع التطبيق:

```bash
composer install --no-dev --prefer-dist --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan storage:link
php artisan optimize
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

لا تشغّل `DemoUserSeeder` على قاعدة Production. خذ نسخة احتياطية قبل كل Migration، واحتفظ بنسخة من `dist` السابق. اختبر تسجيل الدخول، إرسال طلب شراء، عزل المراجع، إصدار أمر الشراء، وصول إشعار الحسابات والمدير العام، والطباعة من النطاقين العامين.

## 11. اختبارات التحقق

نفّذ الاختبارات الآتية من جهاز خارجي:

```bash
curl -I https://app.example.com/
curl -I https://app.example.com/assets/<known-hashed-file>.js
curl -i https://api.example.com/up
curl -i https://api.example.com/api/v1/notifications/stream
```

يُتوقع أن يظهر `Cf-Ray` في الاستجابة، وأن تكون أصول React قابلة للكاش، بينما تكون API وSSE `BYPASS` أو `DYNAMIC` وليست `HIT`. اختبر أيضًا الوصول المباشر إلى عنوان الأصل؛ يجب أن يكون مرفوضًا من الجدار الناري أو غير قادر على تجاوز Cloudflare.

## مراجع Cloudflare الرسمية

1. [Cloudflare Free Plan](https://www.cloudflare.com/plans/free/)
2. [Cache Rules settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)
3. [Protect your origin server](https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/)
4. [Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
5. [Cloudflare IP ranges](https://www.cloudflare.com/ips/)
