# تقرير محاكاة نظام المشتريات — 540 سيناريو

> هذا التقرير أُنشئ بواسطة Seeder إضافي بنمط add-only. لم يتم حذف أو تعديل أي بيانات خارج السيناريوهات ذات البادئة `TEST-540-SCENARIOS`.

| البيان | القيمة |
|---|---:|
| إجمالي السيناريوهات | 540 |
| عدد مجموعات الـAction | 27 |
| السيناريوهات لكل Action | 20 |
| تم إنشاؤه الآن | 540 |
| موجود مسبقًا وتُرك دون تعديل | 0 |
| فشل | 0 |
| وقت التوليد | 2026-08-21T13:09:15+00:00 |

## نقاط الدخول حسب المرحلة

- المجموعات 01–07: طلبات الشراء والمراجعة والاعتماد والرفض والإرجاع.
- المجموعات 08–09: مسار الطلب المباشر عبر الحسابات والمدير التنفيذي.
- المجموعات 10–16: عروض الأسعار، الموردون، الترشيحات والقرار التنفيذي.
- المجموعات 17–19: إنشاء أمر الشراء وتعديله وإصداره.
- المجموعات 20–23: الاستلام المخزني واعتماد مهندس الموقع وإشعار الحسابات الموحد.
- المجموعات 24–26: الفواتير كمديونيات، الدفعات، والتوزيع oldest-first.
- المجموعة 27: البحث والفلترة والتقارير والأرشيف.

## جدول السيناريوهات

| # | Action | الدور | طلب الشراء | PO | GRN | فاتورة | دفعة | الحالة | النتيجة | نقطة الدخول |
|---:|---|---|---|---|---|---|---|---|---|---|
| TEST-01-01 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-01 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-02 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-02 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-03 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-03 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-04 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-04 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-05 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-05 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-06 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-06 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-07 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-07 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-08 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-08 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-09 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-09 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-10 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-10 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-11 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-11 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-12 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-12 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-13 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-13 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-14 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-14 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-15 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-15 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-16 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-16 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-17 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-17 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-18 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-18 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-19 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-19 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-01-20 | إنشاء طلب شراء | employee / جميع منشئي الطلبات | TEST-PR-G01-20 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-01 | حفظ الطلب كمسودة | employee | TEST-PR-G02-01 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-02 | حفظ الطلب كمسودة | employee | TEST-PR-G02-02 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-03 | حفظ الطلب كمسودة | employee | TEST-PR-G02-03 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-04 | حفظ الطلب كمسودة | employee | TEST-PR-G02-04 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-05 | حفظ الطلب كمسودة | employee | TEST-PR-G02-05 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-06 | حفظ الطلب كمسودة | employee | TEST-PR-G02-06 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-07 | حفظ الطلب كمسودة | employee | TEST-PR-G02-07 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-08 | حفظ الطلب كمسودة | employee | TEST-PR-G02-08 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-09 | حفظ الطلب كمسودة | employee | TEST-PR-G02-09 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-10 | حفظ الطلب كمسودة | employee | TEST-PR-G02-10 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-11 | حفظ الطلب كمسودة | employee | TEST-PR-G02-11 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-12 | حفظ الطلب كمسودة | employee | TEST-PR-G02-12 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-13 | حفظ الطلب كمسودة | employee | TEST-PR-G02-13 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-14 | حفظ الطلب كمسودة | employee | TEST-PR-G02-14 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-15 | حفظ الطلب كمسودة | employee | TEST-PR-G02-15 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-16 | حفظ الطلب كمسودة | employee | TEST-PR-G02-16 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-17 | حفظ الطلب كمسودة | employee | TEST-PR-G02-17 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-18 | حفظ الطلب كمسودة | employee | TEST-PR-G02-18 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-19 | حفظ الطلب كمسودة | employee | TEST-PR-G02-19 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-02-20 | حفظ الطلب كمسودة | employee | TEST-PR-G02-20 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-01 | تعديل الطلب | employee / reviewer | TEST-PR-G03-01 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-02 | تعديل الطلب | employee / reviewer | TEST-PR-G03-02 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-03 | تعديل الطلب | employee / reviewer | TEST-PR-G03-03 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-04 | تعديل الطلب | employee / reviewer | TEST-PR-G03-04 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-05 | تعديل الطلب | employee / reviewer | TEST-PR-G03-05 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-06 | تعديل الطلب | employee / reviewer | TEST-PR-G03-06 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-07 | تعديل الطلب | employee / reviewer | TEST-PR-G03-07 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-08 | تعديل الطلب | employee / reviewer | TEST-PR-G03-08 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-09 | تعديل الطلب | employee / reviewer | TEST-PR-G03-09 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-10 | تعديل الطلب | employee / reviewer | TEST-PR-G03-10 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-11 | تعديل الطلب | employee / reviewer | TEST-PR-G03-11 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-12 | تعديل الطلب | employee / reviewer | TEST-PR-G03-12 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-13 | تعديل الطلب | employee / reviewer | TEST-PR-G03-13 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-14 | تعديل الطلب | employee / reviewer | TEST-PR-G03-14 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-15 | تعديل الطلب | employee / reviewer | TEST-PR-G03-15 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-16 | تعديل الطلب | employee / reviewer | TEST-PR-G03-16 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-17 | تعديل الطلب | employee / reviewer | TEST-PR-G03-17 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-18 | تعديل الطلب | employee / reviewer | TEST-PR-G03-18 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-19 | تعديل الطلب | employee / reviewer | TEST-PR-G03-19 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-03-20 | تعديل الطلب | employee / reviewer | TEST-PR-G03-20 | - | - | - | - | DRAFT | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-01 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-01 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-02 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-02 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-03 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-03 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-04 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-04 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-05 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-05 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-06 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-06 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-07 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-07 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-08 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-08 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-09 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-09 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-10 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-10 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-11 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-11 | - | - | - | - | PENDING_PROCUREMENT_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-12 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-12 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-13 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-13 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-14 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-14 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-15 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-15 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-16 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-16 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-17 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-17 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-18 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-18 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-19 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-19 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-04-20 | إرسال الطلب للمراجعة | employee / reviewer / general_manager | TEST-PR-G04-20 | - | - | - | - | SUBMITTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-01 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-01 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-02 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-02 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-03 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-03 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-04 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-04 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-05 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-05 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-06 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-06 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-07 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-07 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-08 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-08 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-09 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-09 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-10 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-10 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-11 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-11 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-12 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-12 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-13 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-13 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-14 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-14 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-15 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-15 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-16 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-16 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-17 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-17 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-18 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-18 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-19 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-19 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-05-20 | اعتماد الطلب | reviewer / general_manager | TEST-PR-G05-20 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-01 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-01 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-02 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-02 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-03 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-03 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-04 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-04 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-05 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-05 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-06 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-06 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-07 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-07 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-08 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-08 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-09 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-09 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-10 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-10 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-11 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-11 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-12 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-12 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-13 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-13 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-14 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-14 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-15 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-15 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-16 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-16 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-17 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-17 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-18 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-18 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-19 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-19 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-06-20 | رفض الطلب مع سبب | reviewer | TEST-PR-G06-20 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-01 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-01 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-02 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-02 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-03 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-03 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-04 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-04 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-05 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-05 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-06 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-06 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-07 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-07 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-08 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-08 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-09 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-09 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-10 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-10 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-11 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-11 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-12 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-12 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-13 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-13 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-14 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-14 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-15 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-15 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-16 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-16 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-17 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-17 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-18 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-18 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-19 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-19 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-07-20 | إعادة الطلب للتعديل | reviewer | TEST-PR-G07-20 | - | - | - | - | REJECTED | PASS | طلبات الشراء / شاشة المراجع / لوحة المدير التنفيذي / الأرشيف |
| TEST-08-01 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-01 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-02 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-02 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-03 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-03 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-04 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-04 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-05 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-05 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-06 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-06 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-07 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-07 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-08 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-08 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-09 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-09 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-10 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-10 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-11 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-11 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-12 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-12 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-13 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-13 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-14 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-14 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-15 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-15 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-16 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-16 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-17 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-17 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-18 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-18 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-19 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-19 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-08-20 | إنشاء طلب شراء مباشر | procurement_manager | TEST-PR-G08-20 | - | - | - | - | PENDING_ACCOUNTING_APPROVAL | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-01 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-01 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-02 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-02 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-03 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-03 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-04 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-04 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-05 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-05 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-06 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-06 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-07 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-07 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-08 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-08 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-09 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-09 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-10 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-10 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-11 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-11 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-12 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-12 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-13 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-13 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-14 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-14 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-15 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-15 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-16 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-16 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-17 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-17 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-18 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-18 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-19 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-19 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-09-20 | اعتماد الحسابات أو رفضها | accountant | TEST-PR-G09-20 | - | - | - | - | APPROVED_BY_ACCOUNTING | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-01 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-01 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-02 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-02 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-03 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-03 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-04 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-04 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-05 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-05 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-06 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-06 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-07 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-07 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-08 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-08 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-09 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-09 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-10 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-10 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-11 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-11 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-12 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-12 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-13 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-13 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-14 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-14 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-15 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-15 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-16 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-16 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-17 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-17 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-18 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-18 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-19 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-19 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-10-20 | بدء عروض الأسعار | procurement_manager | TEST-PR-G10-20 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-01 | إضافة مورد | procurement_manager | TEST-PR-G11-01 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-02 | إضافة مورد | procurement_manager | TEST-PR-G11-02 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-03 | إضافة مورد | procurement_manager | TEST-PR-G11-03 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-04 | إضافة مورد | procurement_manager | TEST-PR-G11-04 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-05 | إضافة مورد | procurement_manager | TEST-PR-G11-05 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-06 | إضافة مورد | procurement_manager | TEST-PR-G11-06 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-07 | إضافة مورد | procurement_manager | TEST-PR-G11-07 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-08 | إضافة مورد | procurement_manager | TEST-PR-G11-08 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-09 | إضافة مورد | procurement_manager | TEST-PR-G11-09 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-10 | إضافة مورد | procurement_manager | TEST-PR-G11-10 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-11 | إضافة مورد | procurement_manager | TEST-PR-G11-11 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-12 | إضافة مورد | procurement_manager | TEST-PR-G11-12 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-13 | إضافة مورد | procurement_manager | TEST-PR-G11-13 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-14 | إضافة مورد | procurement_manager | TEST-PR-G11-14 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-15 | إضافة مورد | procurement_manager | TEST-PR-G11-15 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-16 | إضافة مورد | procurement_manager | TEST-PR-G11-16 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-17 | إضافة مورد | procurement_manager | TEST-PR-G11-17 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-18 | إضافة مورد | procurement_manager | TEST-PR-G11-18 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-19 | إضافة مورد | procurement_manager | TEST-PR-G11-19 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-11-20 | إضافة مورد | procurement_manager | TEST-PR-G11-20 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-01 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-01 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-02 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-02 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-03 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-03 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-04 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-04 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-05 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-05 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-06 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-06 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-07 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-07 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-08 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-08 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-09 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-09 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-10 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-10 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-11 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-11 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-12 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-12 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-13 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-13 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-14 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-14 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-15 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-15 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-16 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-16 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-17 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-17 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-18 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-18 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-19 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-19 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-12-20 | إضافة عرض سعر | procurement_manager | TEST-PR-G12-20 | - | - | - | - | PENDING_QUOTE_RECOMMENDATIONS | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-01 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-01 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-02 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-02 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-03 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-03 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-04 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-04 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-05 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-05 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-06 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-06 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-07 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-07 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-08 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-08 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-09 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-09 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-10 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-10 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-11 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-11 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-12 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-12 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-13 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-13 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-14 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-14 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-15 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-15 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-16 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-16 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-17 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-17 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-18 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-18 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-19 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-19 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-13-20 | ترشيح عرض من الحسابات | accountant | TEST-PR-G13-20 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-01 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-01 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-02 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-02 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-03 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-03 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-04 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-04 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-05 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-05 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-06 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-06 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-07 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-07 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-08 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-08 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-09 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-09 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-10 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-10 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-11 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-11 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-12 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-12 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-13 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-13 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-14 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-14 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-15 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-15 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-16 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-16 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-17 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-17 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-18 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-18 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-19 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-19 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-14-20 | ترشيح عرض من مدير القسم | reviewer | TEST-PR-G14-20 | - | - | - | - | PENDING_EXECUTIVE_QUOTE_DECISION | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-01 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-01 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-02 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-02 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-03 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-03 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-04 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-04 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-05 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-05 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-06 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-06 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-07 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-07 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-08 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-08 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-09 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-09 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-10 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-10 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-11 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-11 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-12 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-12 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-13 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-13 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-14 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-14 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-15 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-15 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-16 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-16 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-17 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-17 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-18 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-18 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-19 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-19 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-15-20 | اختيار العرض من المدير التنفيذي | general_manager | TEST-PR-G15-20 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-01 | رفض العروض | general_manager | TEST-PR-G16-01 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-02 | رفض العروض | general_manager | TEST-PR-G16-02 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-03 | رفض العروض | general_manager | TEST-PR-G16-03 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-04 | رفض العروض | general_manager | TEST-PR-G16-04 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-05 | رفض العروض | general_manager | TEST-PR-G16-05 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-06 | رفض العروض | general_manager | TEST-PR-G16-06 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-07 | رفض العروض | general_manager | TEST-PR-G16-07 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-08 | رفض العروض | general_manager | TEST-PR-G16-08 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-09 | رفض العروض | general_manager | TEST-PR-G16-09 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-10 | رفض العروض | general_manager | TEST-PR-G16-10 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-11 | رفض العروض | general_manager | TEST-PR-G16-11 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-12 | رفض العروض | general_manager | TEST-PR-G16-12 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-13 | رفض العروض | general_manager | TEST-PR-G16-13 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-14 | رفض العروض | general_manager | TEST-PR-G16-14 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-15 | رفض العروض | general_manager | TEST-PR-G16-15 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-16 | رفض العروض | general_manager | TEST-PR-G16-16 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-17 | رفض العروض | general_manager | TEST-PR-G16-17 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-18 | رفض العروض | general_manager | TEST-PR-G16-18 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-19 | رفض العروض | general_manager | TEST-PR-G16-19 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-16-20 | رفض العروض | general_manager | TEST-PR-G16-20 | - | - | - | - | REJECTED | PASS | مدير المشتريات → عروض الأسعار والترشيحات والقرار التنفيذي |
| TEST-17-01 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-01 | TEST-PO-G17-01 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-02 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-02 | TEST-PO-G17-02 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-03 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-03 | TEST-PO-G17-03 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-04 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-04 | TEST-PO-G17-04 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-05 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-05 | TEST-PO-G17-05 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-06 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-06 | TEST-PO-G17-06 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-07 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-07 | TEST-PO-G17-07 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-08 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-08 | TEST-PO-G17-08 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-09 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-09 | TEST-PO-G17-09 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-10 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-10 | TEST-PO-G17-10 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-11 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-11 | TEST-PO-G17-11 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-12 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-12 | TEST-PO-G17-12 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-13 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-13 | TEST-PO-G17-13 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-14 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-14 | TEST-PO-G17-14 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-15 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-15 | TEST-PO-G17-15 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-16 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-16 | TEST-PO-G17-16 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-17 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-17 | TEST-PO-G17-17 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-18 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-18 | TEST-PO-G17-18 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-19 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-19 | TEST-PO-G17-19 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-17-20 | إنشاء أمر شراء | procurement_manager | TEST-PR-G17-20 | TEST-PO-G17-20 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-01 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-01 | TEST-PO-G18-01 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-02 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-02 | TEST-PO-G18-02 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-03 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-03 | TEST-PO-G18-03 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-04 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-04 | TEST-PO-G18-04 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-05 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-05 | TEST-PO-G18-05 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-06 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-06 | TEST-PO-G18-06 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-07 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-07 | TEST-PO-G18-07 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-08 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-08 | TEST-PO-G18-08 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-09 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-09 | TEST-PO-G18-09 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-10 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-10 | TEST-PO-G18-10 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-11 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-11 | TEST-PO-G18-11 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-12 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-12 | TEST-PO-G18-12 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-13 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-13 | TEST-PO-G18-13 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-14 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-14 | TEST-PO-G18-14 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-15 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-15 | TEST-PO-G18-15 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-16 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-16 | TEST-PO-G18-16 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-17 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-17 | TEST-PO-G18-17 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-18 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-18 | TEST-PO-G18-18 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-19 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-19 | TEST-PO-G18-19 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-18-20 | تعديل أمر الشراء | procurement_manager | TEST-PR-G18-20 | TEST-PO-G18-20 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-01 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-01 | TEST-PO-G19-01 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-02 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-02 | TEST-PO-G19-02 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-03 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-03 | TEST-PO-G19-03 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-04 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-04 | TEST-PO-G19-04 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-05 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-05 | TEST-PO-G19-05 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-06 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-06 | TEST-PO-G19-06 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-07 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-07 | TEST-PO-G19-07 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-08 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-08 | TEST-PO-G19-08 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-09 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-09 | TEST-PO-G19-09 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-10 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-10 | TEST-PO-G19-10 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-11 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-11 | TEST-PO-G19-11 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-12 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-12 | TEST-PO-G19-12 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-13 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-13 | TEST-PO-G19-13 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-14 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-14 | TEST-PO-G19-14 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-15 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-15 | TEST-PO-G19-15 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-16 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-16 | TEST-PO-G19-16 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-17 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-17 | TEST-PO-G19-17 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-18 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-18 | TEST-PO-G19-18 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-19 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-19 | TEST-PO-G19-19 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-19-20 | إرسال أمر الشراء للمورد | procurement_manager | TEST-PR-G19-20 | TEST-PO-G19-20 | - | - | - | APPROVED_BY_PROCUREMENT | PASS | مدير المشتريات → الطلبات المعتمدة وأوامر الشراء |
| TEST-20-01 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-01 | TEST-PO-G20-01 | TEST-GRN-G20-01 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-02 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-02 | TEST-PO-G20-02 | TEST-GRN-G20-02 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-03 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-03 | TEST-PO-G20-03 | TEST-GRN-G20-03 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-04 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-04 | TEST-PO-G20-04 | TEST-GRN-G20-04 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-05 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-05 | TEST-PO-G20-05 | TEST-GRN-G20-05 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-06 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-06 | TEST-PO-G20-06 | TEST-GRN-G20-06 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-07 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-07 | TEST-PO-G20-07 | TEST-GRN-G20-07 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-08 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-08 | TEST-PO-G20-08 | TEST-GRN-G20-08 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-09 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-09 | TEST-PO-G20-09 | TEST-GRN-G20-09 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-10 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-10 | TEST-PO-G20-10 | TEST-GRN-G20-10 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-11 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-11 | TEST-PO-G20-11 | TEST-GRN-G20-11 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-12 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-12 | TEST-PO-G20-12 | TEST-GRN-G20-12 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-13 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-13 | TEST-PO-G20-13 | TEST-GRN-G20-13 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-14 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-14 | TEST-PO-G20-14 | TEST-GRN-G20-14 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-15 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-15 | TEST-PO-G20-15 | TEST-GRN-G20-15 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-16 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-16 | TEST-PO-G20-16 | TEST-GRN-G20-16 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-17 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-17 | TEST-PO-G20-17 | TEST-GRN-G20-17 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-18 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-18 | TEST-PO-G20-18 | TEST-GRN-G20-18 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-19 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-19 | TEST-PO-G20-19 | TEST-GRN-G20-19 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-20-20 | تسجيل الاستلام بواسطة أمين المخزن | warehouse_keeper | TEST-PR-G20-20 | TEST-PO-G20-20 | TEST-GRN-G20-20 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-01 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-01 | TEST-PO-G21-01 | TEST-GRN-G21-01 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-02 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-02 | TEST-PO-G21-02 | TEST-GRN-G21-02 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-03 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-03 | TEST-PO-G21-03 | TEST-GRN-G21-03 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-04 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-04 | TEST-PO-G21-04 | TEST-GRN-G21-04 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-05 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-05 | TEST-PO-G21-05 | TEST-GRN-G21-05 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-06 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-06 | TEST-PO-G21-06 | TEST-GRN-G21-06 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-07 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-07 | TEST-PO-G21-07 | TEST-GRN-G21-07 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-08 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-08 | TEST-PO-G21-08 | TEST-GRN-G21-08 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-09 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-09 | TEST-PO-G21-09 | TEST-GRN-G21-09 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-10 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-10 | TEST-PO-G21-10 | TEST-GRN-G21-10 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-11 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-11 | TEST-PO-G21-11 | TEST-GRN-G21-11 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-12 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-12 | TEST-PO-G21-12 | TEST-GRN-G21-12 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-13 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-13 | TEST-PO-G21-13 | TEST-GRN-G21-13 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-14 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-14 | TEST-PO-G21-14 | TEST-GRN-G21-14 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-15 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-15 | TEST-PO-G21-15 | TEST-GRN-G21-15 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-16 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-16 | TEST-PO-G21-16 | TEST-GRN-G21-16 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-17 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-17 | TEST-PO-G21-17 | TEST-GRN-G21-17 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-18 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-18 | TEST-PO-G21-18 | TEST-GRN-G21-18 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-19 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-19 | TEST-PO-G21-19 | TEST-GRN-G21-19 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-21-20 | تعديل إذن الاستلام بواسطة مهندس الموقع | site_engineer | TEST-PR-G21-20 | TEST-PO-G21-20 | TEST-GRN-G21-20 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-01 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-01 | TEST-PO-G22-01 | TEST-GRN-G22-01 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-02 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-02 | TEST-PO-G22-02 | TEST-GRN-G22-02 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-03 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-03 | TEST-PO-G22-03 | TEST-GRN-G22-03 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-04 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-04 | TEST-PO-G22-04 | TEST-GRN-G22-04 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-05 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-05 | TEST-PO-G22-05 | TEST-GRN-G22-05 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-06 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-06 | TEST-PO-G22-06 | TEST-GRN-G22-06 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-07 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-07 | TEST-PO-G22-07 | TEST-GRN-G22-07 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-08 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-08 | TEST-PO-G22-08 | TEST-GRN-G22-08 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-09 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-09 | TEST-PO-G22-09 | TEST-GRN-G22-09 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-10 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-10 | TEST-PO-G22-10 | TEST-GRN-G22-10 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-11 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-11 | TEST-PO-G22-11 | TEST-GRN-G22-11 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-12 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-12 | TEST-PO-G22-12 | TEST-GRN-G22-12 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-13 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-13 | TEST-PO-G22-13 | TEST-GRN-G22-13 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-14 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-14 | TEST-PO-G22-14 | TEST-GRN-G22-14 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-15 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-15 | TEST-PO-G22-15 | TEST-GRN-G22-15 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-16 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-16 | TEST-PO-G22-16 | TEST-GRN-G22-16 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-17 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-17 | TEST-PO-G22-17 | TEST-GRN-G22-17 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-18 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-18 | TEST-PO-G22-18 | TEST-GRN-G22-18 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-19 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-19 | TEST-PO-G22-19 | TEST-GRN-G22-19 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-22-20 | اعتماد إذن الاستلام | site_engineer | TEST-PR-G22-20 | TEST-PO-G22-20 | TEST-GRN-G22-20 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-01 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-01 | TEST-PO-G23-01 | TEST-GRN-G23-01 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-02 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-02 | TEST-PO-G23-02 | TEST-GRN-G23-02 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-03 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-03 | TEST-PO-G23-03 | TEST-GRN-G23-03 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-04 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-04 | TEST-PO-G23-04 | TEST-GRN-G23-04 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-05 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-05 | TEST-PO-G23-05 | TEST-GRN-G23-05 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-06 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-06 | TEST-PO-G23-06 | TEST-GRN-G23-06 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-07 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-07 | TEST-PO-G23-07 | TEST-GRN-G23-07 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-08 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-08 | TEST-PO-G23-08 | TEST-GRN-G23-08 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-09 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-09 | TEST-PO-G23-09 | TEST-GRN-G23-09 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-10 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-10 | TEST-PO-G23-10 | TEST-GRN-G23-10 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-11 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-11 | TEST-PO-G23-11 | TEST-GRN-G23-11 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-12 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-12 | TEST-PO-G23-12 | TEST-GRN-G23-12 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-13 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-13 | TEST-PO-G23-13 | TEST-GRN-G23-13 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-14 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-14 | TEST-PO-G23-14 | TEST-GRN-G23-14 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-15 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-15 | TEST-PO-G23-15 | TEST-GRN-G23-15 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-16 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-16 | TEST-PO-G23-16 | TEST-GRN-G23-16 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-17 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-17 | TEST-PO-G23-17 | TEST-GRN-G23-17 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-18 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-18 | TEST-PO-G23-18 | TEST-GRN-G23-18 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-19 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-19 | TEST-PO-G23-19 | TEST-GRN-G23-19 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-23-20 | إرسال أمر الشراء وإذن الاستلام للحسابات | accountant | TEST-PR-G23-20 | TEST-PO-G23-20 | TEST-GRN-G23-20 | - | - | APPROVED_BY_PROCUREMENT | PASS | الاستلام → أمين المخزن → مهندس الموقع → إشعار الحسابات |
| TEST-24-01 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-01 | TEST-PO-G24-01 | TEST-GRN-G24-01 | TEST-INV-2026-G24-01 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-02 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-02 | TEST-PO-G24-02 | TEST-GRN-G24-02 | TEST-INV-2026-G24-02 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-03 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-03 | TEST-PO-G24-03 | TEST-GRN-G24-03 | TEST-INV-2026-G24-03 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-04 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-04 | TEST-PO-G24-04 | TEST-GRN-G24-04 | TEST-INV-2026-G24-04 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-05 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-05 | TEST-PO-G24-05 | TEST-GRN-G24-05 | TEST-INV-2026-G24-05 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-06 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-06 | TEST-PO-G24-06 | TEST-GRN-G24-06 | TEST-INV-2026-G24-06 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-07 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-07 | TEST-PO-G24-07 | TEST-GRN-G24-07 | TEST-INV-2026-G24-07 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-08 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-08 | TEST-PO-G24-08 | TEST-GRN-G24-08 | TEST-INV-2026-G24-08 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-09 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-09 | TEST-PO-G24-09 | TEST-GRN-G24-09 | TEST-INV-2026-G24-09 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-10 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-10 | TEST-PO-G24-10 | TEST-GRN-G24-10 | TEST-INV-2026-G24-10 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-11 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-11 | TEST-PO-G24-11 | TEST-GRN-G24-11 | TEST-INV-2026-G24-11 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-12 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-12 | TEST-PO-G24-12 | TEST-GRN-G24-12 | TEST-INV-2026-G24-12 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-13 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-13 | TEST-PO-G24-13 | TEST-GRN-G24-13 | TEST-INV-2026-G24-13 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-14 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-14 | TEST-PO-G24-14 | TEST-GRN-G24-14 | TEST-INV-2026-G24-14 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-15 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-15 | TEST-PO-G24-15 | TEST-GRN-G24-15 | TEST-INV-2026-G24-15 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-16 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-16 | TEST-PO-G24-16 | TEST-GRN-G24-16 | TEST-INV-2026-G24-16 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-17 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-17 | TEST-PO-G24-17 | TEST-GRN-G24-17 | TEST-INV-2026-G24-17 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-18 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-18 | TEST-PO-G24-18 | TEST-GRN-G24-18 | TEST-INV-2026-G24-18 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-19 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-19 | TEST-PO-G24-19 | TEST-GRN-G24-19 | TEST-INV-2026-G24-19 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-24-20 | تسجيل فاتورة المورد كمديونية | accountant | TEST-PR-G24-20 | TEST-PO-G24-20 | TEST-GRN-G24-20 | TEST-INV-2026-G24-20 | - | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-01 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-01 | TEST-PO-G25-01 | TEST-GRN-G25-01 | TEST-INV-2026-G25-01 | TEST-PAY-2026-G25-01 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-02 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-02 | TEST-PO-G25-02 | TEST-GRN-G25-02 | TEST-INV-2026-G25-02 | TEST-PAY-2026-G25-02 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-03 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-03 | TEST-PO-G25-03 | TEST-GRN-G25-03 | TEST-INV-2026-G25-03 | TEST-PAY-2026-G25-03 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-04 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-04 | TEST-PO-G25-04 | TEST-GRN-G25-04 | TEST-INV-2026-G25-04 | TEST-PAY-2026-G25-04 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-05 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-05 | TEST-PO-G25-05 | TEST-GRN-G25-05 | TEST-INV-2026-G25-05 | TEST-PAY-2026-G25-05 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-06 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-06 | TEST-PO-G25-06 | TEST-GRN-G25-06 | TEST-INV-2026-G25-06 | TEST-PAY-2026-G25-06 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-07 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-07 | TEST-PO-G25-07 | TEST-GRN-G25-07 | TEST-INV-2026-G25-07 | TEST-PAY-2026-G25-07 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-08 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-08 | TEST-PO-G25-08 | TEST-GRN-G25-08 | TEST-INV-2026-G25-08 | TEST-PAY-2026-G25-08 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-09 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-09 | TEST-PO-G25-09 | TEST-GRN-G25-09 | TEST-INV-2026-G25-09 | TEST-PAY-2026-G25-09 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-10 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-10 | TEST-PO-G25-10 | TEST-GRN-G25-10 | TEST-INV-2026-G25-10 | TEST-PAY-2026-G25-10 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-11 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-11 | TEST-PO-G25-11 | TEST-GRN-G25-11 | TEST-INV-2026-G25-11 | TEST-PAY-2026-G25-11 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-12 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-12 | TEST-PO-G25-12 | TEST-GRN-G25-12 | TEST-INV-2026-G25-12 | TEST-PAY-2026-G25-12 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-13 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-13 | TEST-PO-G25-13 | TEST-GRN-G25-13 | TEST-INV-2026-G25-13 | TEST-PAY-2026-G25-13 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-14 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-14 | TEST-PO-G25-14 | TEST-GRN-G25-14 | TEST-INV-2026-G25-14 | TEST-PAY-2026-G25-14 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-15 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-15 | TEST-PO-G25-15 | TEST-GRN-G25-15 | TEST-INV-2026-G25-15 | TEST-PAY-2026-G25-15 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-16 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-16 | TEST-PO-G25-16 | TEST-GRN-G25-16 | TEST-INV-2026-G25-16 | TEST-PAY-2026-G25-16 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-17 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-17 | TEST-PO-G25-17 | TEST-GRN-G25-17 | TEST-INV-2026-G25-17 | TEST-PAY-2026-G25-17 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-18 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-18 | TEST-PO-G25-18 | TEST-GRN-G25-18 | TEST-INV-2026-G25-18 | TEST-PAY-2026-G25-18 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-19 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-19 | TEST-PO-G25-19 | TEST-GRN-G25-19 | TEST-INV-2026-G25-19 | TEST-PAY-2026-G25-19 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-25-20 | تسجيل دفعة للمورد | accountant | TEST-PR-G25-20 | TEST-PO-G25-20 | TEST-GRN-G25-20 | TEST-INV-2026-G25-20 | TEST-PAY-2026-G25-20 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-01 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-01 | - | - | - | TEST-PAY-2026-G26-01 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-02 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-02 | - | - | - | TEST-PAY-2026-G26-02 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-03 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-03 | - | - | - | TEST-PAY-2026-G26-03 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-04 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-04 | - | - | - | TEST-PAY-2026-G26-04 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-05 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-05 | - | - | - | TEST-PAY-2026-G26-05 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-06 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-06 | - | - | - | TEST-PAY-2026-G26-06 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-07 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-07 | - | - | - | TEST-PAY-2026-G26-07 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-08 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-08 | - | - | - | TEST-PAY-2026-G26-08 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-09 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-09 | - | - | - | TEST-PAY-2026-G26-09 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-10 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-10 | - | - | - | TEST-PAY-2026-G26-10 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-11 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-11 | - | - | - | TEST-PAY-2026-G26-11 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-12 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-12 | - | - | - | TEST-PAY-2026-G26-12 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-13 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-13 | - | - | - | TEST-PAY-2026-G26-13 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-14 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-14 | - | - | - | TEST-PAY-2026-G26-14 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-15 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-15 | - | - | - | TEST-PAY-2026-G26-15 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-16 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-16 | - | - | - | TEST-PAY-2026-G26-16 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-17 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-17 | - | - | - | TEST-PAY-2026-G26-17 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-18 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-18 | - | - | - | TEST-PAY-2026-G26-18 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-19 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-19 | - | - | - | TEST-PAY-2026-G26-19 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-26-20 | توزيع الدفعة على أقدم المديونيات | accountant | TEST-PR-G26-20 | - | - | - | TEST-PAY-2026-G26-20 | APPROVED_BY_PROCUREMENT | PASS | الحسابات → أرشيف الفواتير وحسابات الموردين والدفعات |
| TEST-27-01 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-01 | - | - | - | - | DRAFT | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-02 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-02 | - | - | - | - | SUBMITTED | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-03 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-03 | - | - | - | - | UNDER_REVIEW | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-04 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-04 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-05 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-05 | - | - | - | - | REJECTED | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-06 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-06 | - | - | - | - | PENDING_PROCUREMENT_APPROVAL | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-07 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-07 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-08 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-08 | - | - | - | - | DRAFT | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-09 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-09 | - | - | - | - | SUBMITTED | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-10 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-10 | - | - | - | - | UNDER_REVIEW | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-11 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-11 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-12 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-12 | - | - | - | - | REJECTED | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-13 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-13 | - | - | - | - | PENDING_PROCUREMENT_APPROVAL | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-14 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-14 | - | - | - | - | APPROVED_BY_PROCUREMENT | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-15 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-15 | - | - | - | - | DRAFT | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-16 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-16 | - | - | - | - | SUBMITTED | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-17 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-17 | - | - | - | - | UNDER_REVIEW | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-18 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-18 | - | - | - | - | PENDING_EXECUTIVE_APPROVAL | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-19 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-19 | - | - | - | - | REJECTED | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |
| TEST-27-20 | البحث والفلترة والتقارير والأرشيف | all_roles_archive | TEST-PR-G27-20 | - | - | - | - | PENDING_PROCUREMENT_APPROVAL | PASS | الأرشيف والبحث والفلترة وسجل الإجراءات |

## ملاحظات التراجع وعدم الحذف

كل السجلات التجريبية تحمل البادئة `TEST-540-SCENARIOS` في الملاحظات، وكل أرقام المستندات تبدأ بـ `TEST-`. لم ينفذ Seeder أي حذف أو تنظيف للبيانات الموجودة. إعادة التشغيل تتجاوز السجلات الموجودة بنفس رقم الطلب بدل إنشاء نسخ مكررة.
