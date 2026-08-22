<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class EgyptianSuppliers100Seeder extends Seeder
{
    /**
     * Add the official 100-record Egyptian supplier demo catalog.
     * The names and contact details are synthetic demo data for local testing.
     */
    public function run(): void
    {
        $activities = [
            'مواد البناء',
            'الحديد والأسمنت',
            'الخرسانة الجاهزة',
            'الزلط والرمل',
            'الطوب والبلوك',
            'العزل المائي والحراري',
            'الأخشاب والنجارة',
            'الألوميتال والواجهات',
            'الدهانات والتشطيبات',
            'الكهرباء واللوحات',
            'السباكة والأدوات الصحية',
            'التكييف والتهوية',
            'السقالات والشدات',
            'المعدات الثقيلة',
            'الأدوات والمهمات',
            'السلامة ومكافحة الحريق',
            'النقل واللوجستيات',
            'المحاجر والرخام',
            'الزجاج والسيكوريت',
            'اللافتات والتجهيزات',
        ];

        $contacts = [
            'أحمد محمود',
            'محمد السيد',
            'محمود حسن',
            'مصطفى علي',
            'إبراهيم سالم',
            'خالد عبدالعزيز',
            'عمرو فاروق',
            'حسام الدين أحمد',
            'طارق يوسف',
            'ياسر صبري',
            'شريف عادل',
            'وليد سمير',
            'عاطف كمال',
            'حمدي مراد',
            'رامي نبيل',
            'سعيد عبدالفتاح',
            'أشرف جابر',
            'عمر جمال',
            'كريم عاطف',
            'هاني فؤاد',
        ];

        $locations = [
            'القاهرة - مدينة نصر',
            'الجيزة - السادس من أكتوبر',
            'القليوبية - العبور',
            'الإسكندرية - برج العرب',
            'الشرقية - العاشر من رمضان',
            'الدقهلية - المنصورة',
            'البحيرة - دمنهور',
            'الغربية - المحلة الكبرى',
            'المنوفية - السادات',
            'كفر الشيخ - بلطيم',
            'دمياط - دمياط الجديدة',
            'بورسعيد - المنطقة الصناعية',
            'الإسماعيلية - المنطقة الحرة',
            'السويس - عتاقة',
            'الفيوم - كوم أوشيم',
            'بني سويف - شرق النيل',
            'المنيا - المنطقة الصناعية',
            'أسيوط - عرب العوامر',
            'سوهاج - الكوثر',
            'قنا - قفط',
        ];

        $paymentTerms = [
            'آجل 30 يومًا',
            'آجل 45 يومًا',
            'آجل 60 يومًا',
            'نقدي عند التوريد',
            'دفعة مقدمة والباقي عند الاستلام',
        ];

        foreach (range(1, 100) as $number) {
            $activityIndex = ($number - 1) % count($activities);
            $contactIndex = ($number - 1) % count($contacts);
            $locationIndex = ($number - 1) % count($locations);
            $termsIndex = ($number - 1) % count($paymentTerms);
            $code = str_pad((string) $number, 3, '0', STR_PAD_LEFT);

            $supplier = Supplier::withTrashed()->updateOrCreate(
                ['company_name' => "مورد مصري تجريبي {$code} - {$activities[$activityIndex]}"],
                [
                    'contact_name' => $contacts[$contactIndex],
                    'email' => "egypt-demo-supplier-{$code}@ashbiliya.local",
                    'phone' => '+20 10 9000 ' . $code,
                    'address' => $locations[$locationIndex],
                    'payment_terms' => $paymentTerms[$termsIndex],
                    'is_active' => true,
                ],
            );

            if ($supplier->trashed()) {
                $supplier->restore();
            }
        }
    }
}
