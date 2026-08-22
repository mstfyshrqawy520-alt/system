<?php

namespace Database\Seeders;

use App\Models\Supplier;
use Illuminate\Database\Seeder;

class ArabicSuppliersSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            ['company_name' => 'شركة النور لمواد البناء', 'contact_name' => 'محمد أحمد'],
            ['company_name' => 'شركة الأهرام للتوريدات الإنشائية', 'contact_name' => 'جمال علي'],
            ['company_name' => 'شركة الرواد للحديد والأسمنت', 'contact_name' => 'أحمد محمود'],
            ['company_name' => 'شركة الإعمار العربي', 'contact_name' => 'محمد حسن'],
            ['company_name' => 'شركة الصفوة لمستلزمات المواقع', 'contact_name' => 'جمال مصطفى'],
            ['company_name' => 'شركة المتحدة للخرسانة الجاهزة', 'contact_name' => 'أحمد إبراهيم'],
            ['company_name' => 'شركة الجيزة لمواد البناء', 'contact_name' => 'محمد علي'],
            ['company_name' => 'شركة المروة للتوريدات', 'contact_name' => 'جمال محمد'],
            ['company_name' => 'شركة النيل للزلط والرمل', 'contact_name' => 'أحمد حسن'],
            ['company_name' => 'شركة البناء الحديث', 'contact_name' => 'محمد مصطفى'],
            ['company_name' => 'شركة الوادي للحديد', 'contact_name' => 'جمال أحمد'],
            ['company_name' => 'شركة المستقبل للعزل الإنشائي', 'contact_name' => 'أحمد علي'],
            ['company_name' => 'شركة الثقة للمقاولات والتوريدات', 'contact_name' => 'محمد إبراهيم'],
            ['company_name' => 'شركة مصر للشدات والسقالات', 'contact_name' => 'جمال حسن'],
            ['company_name' => 'شركة الأمان لتوريد الأخشاب', 'contact_name' => 'أحمد مصطفى'],
            ['company_name' => 'شركة النخبة للبلوك والطوب', 'contact_name' => 'محمد جمال'],
            ['company_name' => 'شركة النصر للإضافات الخرسانية', 'contact_name' => 'جمال محمود'],
            ['company_name' => 'شركة الأمل لمواد الأسقف', 'contact_name' => 'أحمد جمال'],
            ['company_name' => 'شركة السلام للمونة والمواد الإنشائية', 'contact_name' => 'محمد محمود'],
            ['company_name' => 'شركة التميز للتوريدات العامة', 'contact_name' => 'جمال إبراهيم'],
        ];

        foreach ($suppliers as $index => $supplier) {
            $number = str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
            Supplier::updateOrCreate(
                ['company_name' => $supplier['company_name']],
                [
                    'contact_name' => $supplier['contact_name'],
                    'email' => "supplier{$number}@ashbiliya.local",
                    'phone' => '+20 10 0000 ' . str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                    'address' => 'مصر - القاهرة',
                    'payment_terms' => 'آجل 30 يومًا',
                    'is_active' => true,
                ]
            );
        }
    }
}
