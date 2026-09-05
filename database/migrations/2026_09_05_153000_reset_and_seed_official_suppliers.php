<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Delete existing suppliers and populate with official company suppliers directory:
     * - حديد (3 موردين)
     * - أسمنت (3 موردين)
     * - سن ورمل (23 مورد)
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Clean supplier balance accounts and suppliers
        if (Schema::hasTable('supplier_balances')) {
            DB::table('supplier_balances')->delete();
        }

        if (Schema::hasTable('suppliers')) {
            DB::table('suppliers')->delete();
        }

        // 2. Prepare 29 official suppliers
        $rawSuppliers = [
            // ==========================================
            // 1. قطاع الحديد
            // ==========================================
            [
                'company_name' => 'م / عبود',
                'contact_name' => 'م / عبود',
                'phone' => '01001160664',
                'address' => 'المصانع',
                'payment_terms' => 'توريد: كل الاماكن ماعدا الفردوس',
                'opening_balance_notes' => 'النشاط: حديد | أماكن التوريد: كل الاماكن ماعدا الفردوس',
            ],
            [
                'company_name' => 'الحاج / مبروك رسلان',
                'contact_name' => 'الحاج / مبروك رسلان',
                'phone' => '01040505519',
                'address' => 'الفردوس',
                'payment_terms' => 'توريد: الفردوس . وباقى الاماكن',
                'opening_balance_notes' => 'النشاط: حديد | أماكن التوريد: الفردوس . وباقى الاماكن',
            ],
            [
                'company_name' => 'حسان',
                'contact_name' => 'حسان',
                'phone' => '01280221172',
                'address' => 'المصانع',
                'payment_terms' => 'توريد: كل الاماكن ماعدا الفردوس',
                'opening_balance_notes' => 'النشاط: حديد | أماكن التوريد: كل الاماكن ماعدا الفردوس',
            ],

            // ==========================================
            // 2. قطاع الأسمنت
            // ==========================================
            [
                'company_name' => 'أ . مصطفى صقر',
                'contact_name' => 'أ . مصطفى صقر',
                'phone' => '01222413901',
                'address' => 'م 35',
                'payment_terms' => null,
                'opening_balance_notes' => 'النشاط: أسمنت',
            ],
            [
                'company_name' => 'أ . محمد النمس',
                'contact_name' => 'أ . محمد النمس',
                'phone' => '01017726484',
                'address' => 'م 29',
                'payment_terms' => null,
                'opening_balance_notes' => 'النشاط: أسمنت',
            ],
            [
                'company_name' => 'محمود عرب النخيل 4&5',
                'contact_name' => 'محمود',
                'phone' => '01221700310',
                'address' => 'عرب النخيل 4 & 5',
                'payment_terms' => 'توريد: النخيل 4 & 5',
                'opening_balance_notes' => 'النشاط: أسمنت | أماكن التوريد: النخيل 4 & 5',
            ],

            // ==========================================
            // 3. قطاع سن ورمل
            // ==========================================
            [
                'company_name' => 'أبو مالك 1',
                'contact_name' => 'أبو مالك',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الفردوس 1 & الزيتون 4&6',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الفردوس 1 & الزيتون 4&6',
            ],
            [
                'company_name' => 'سيف',
                'contact_name' => 'سيف',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الفردوس 2',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الفردوس 2',
            ],
            [
                'company_name' => 'محمود سلطان',
                'contact_name' => 'محمود سلطان',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الفردوس 2',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الفردوس 2',
            ],
            [
                'company_name' => 'أبو مهند',
                'contact_name' => 'أبو مهند',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الفردوس 3',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الفردوس 3',
            ],
            [
                'company_name' => 'جمعة',
                'contact_name' => 'جمعة',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الفردوس 3',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الفردوس 3',
            ],
            [
                'company_name' => 'الحاج عطية',
                'contact_name' => 'الحاج عطية',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: النخيل 1& 2',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: النخيل 1& 2',
            ],
            [
                'company_name' => 'محجوب',
                'contact_name' => 'محجوب',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: النخيل 3 & 6',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: النخيل 3 & 6',
            ],
            [
                'company_name' => 'مهدى',
                'contact_name' => 'مهدى',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: النخيل 3 & 6',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: النخيل 3 & 6',
            ],
            [
                'company_name' => 'أبو أدم 1',
                'contact_name' => 'أبو أدم',
                'phone' => '01221700310',
                'address' => null,
                'payment_terms' => 'توريد: النخيل 4 & 5',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: النخيل 4 & 5',
            ],
            [
                'company_name' => 'محاسب أحمد 1',
                'contact_name' => 'محاسب أحمد',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: النرجس 1',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: النرجس 1',
            ],
            [
                'company_name' => 'محاسب أحمد 2',
                'contact_name' => 'محاسب أحمد',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: النرجس 4',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: النرجس 4',
            ],
            [
                'company_name' => 'أبو مازن',
                'contact_name' => 'أبو مازن',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: النرجس 6',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: النرجس 6',
            ],
            [
                'company_name' => 'حنفى',
                'contact_name' => 'حنفى',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: النرجس 7',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: النرجس 7',
            ],
            [
                'company_name' => 'محمود',
                'contact_name' => 'محمود',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الزيتون 1 & 2',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الزيتون 1 & 2',
            ],
            [
                'company_name' => 'طلبة',
                'contact_name' => 'طلبة',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الزيتون 3 & 5',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الزيتون 3 & 5',
            ],
            [
                'company_name' => 'باهر',
                'contact_name' => 'باهر',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الكوثر 1',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الكوثر 1',
            ],
            [
                'company_name' => 'أبو مالك 2',
                'contact_name' => 'أبو مالك',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الكوثر 6',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الكوثر 6',
            ],
            [
                'company_name' => 'سعيد',
                'contact_name' => 'سعيد',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الكوثر 4',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الكوثر 4',
            ],
            [
                'company_name' => 'أبو أدم 2',
                'contact_name' => 'أبو أدم',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: الكوثر 5',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: الكوثر 5',
            ],
            [
                'company_name' => 'عبد الرحمن',
                'contact_name' => 'عبد الرحمن',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: باقى 29 & 21 & 22',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: باقى 29 & 21 & 22',
            ],
            [
                'company_name' => 'محمد النمس',
                'contact_name' => 'محمد النمس',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: جزء فى ال 29',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: جزء فى ال 29',
            ],
            [
                'company_name' => 'أبو عدى',
                'contact_name' => 'أبو عدى',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: 35',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: 35',
            ],
            [
                'company_name' => 'حامد',
                'contact_name' => 'حامد',
                'phone' => null,
                'address' => null,
                'payment_terms' => 'توريد: 36',
                'opening_balance_notes' => 'النشاط: سن ورمل | أماكن التوريد: 36',
            ],
        ];

        $now = now();
        $normalizedSuppliers = array_map(function ($s) use ($now) {
            return [
                'company_name' => $s['company_name'],
                'contact_name' => $s['contact_name'] ?? null,
                'email' => $s['email'] ?? null,
                'phone' => $s['phone'] ?? null,
                'address' => $s['address'] ?? null,
                'payment_terms' => $s['payment_terms'] ?? null,
                'opening_balance' => 0.00,
                'opening_balance_notes' => $s['opening_balance_notes'] ?? null,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }, $rawSuppliers);

        foreach ($normalizedSuppliers as $supplier) {
            DB::table('suppliers')->insert($supplier);
        }

        Schema::enableForeignKeyConstraints();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
