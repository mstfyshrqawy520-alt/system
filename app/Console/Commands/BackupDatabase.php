<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class BackupDatabase extends Command
{
    protected $signature = 'db:backup {--path= : مسار مجلد النسخ الاحتياطية}';

    protected $description = 'إنشاء نسخة احتياطية آمنة من قاعدة بيانات النظام';

    public function handle(): int
    {
        $driver = DB::connection()->getDriverName();
        if ($driver !== 'sqlite') {
            $this->error('هذا الأمر يدعم SQLite حاليًا. استخدم أداة النسخ الأصلية لمحرك قاعدة الإنتاج بعد تحديدها.');
            return self::FAILURE;
        }

        $source = (string) config('database.connections.sqlite.database');
        if ($source === ':memory:' || ! is_file($source)) {
            $this->error('ملف قاعدة البيانات SQLite غير موجود أو يعمل في الذاكرة فقط.');
            return self::FAILURE;
        }

        $directory = (string) ($this->option('path') ?: storage_path('app/backups'));
        File::ensureDirectoryExists($directory);
        $target = rtrim($directory, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'procurement_' . now()->format('Ymd_His') . '.sqlite';

        if (! File::copy($source, $target)) {
            $this->error('تعذر إنشاء النسخة الاحتياطية. تحقق من صلاحيات مجلد التخزين.');
            return self::FAILURE;
        }

        $this->info("تم إنشاء النسخة الاحتياطية بنجاح: {$target}");
        return self::SUCCESS;
    }
}
