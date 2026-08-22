<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class RestoreDatabase extends Command
{
    protected $signature = 'db:restore {backup : المسار الكامل لملف SQLite الاحتياطي} {--force : تأكيد استبدال قاعدة البيانات الحالية}';

    protected $description = 'استعادة قاعدة بيانات SQLite بعد أخذ نسخة أمان تلقائية';

    public function handle(): int
    {
        if (! $this->option('force')) {
            $this->error('الاستعادة عملية مدمرة. أعد تشغيل الأمر مع --force بعد التأكد من ملف النسخة.');
            return self::FAILURE;
        }

        $driver = DB::connection()->getDriverName();
        if ($driver !== 'sqlite') {
            $this->error('هذا الأمر يدعم SQLite حاليًا فقط.');
            return self::FAILURE;
        }

        $backup = (string) $this->argument('backup');
        $database = (string) config('database.connections.sqlite.database');
        if (! is_file($backup) || strtolower(pathinfo($backup, PATHINFO_EXTENSION)) !== 'sqlite') {
            $this->error('ملف النسخة الاحتياطية غير موجود أو امتداده ليس sqlite.');
            return self::FAILURE;
        }
        if ($backup === $database) {
            $this->error('لا يمكن استعادة قاعدة البيانات من الملف نفسه.');
            return self::FAILURE;
        }

        $directory = storage_path('app/backups');
        File::ensureDirectoryExists($directory);
        $safetyCopy = $directory . DIRECTORY_SEPARATOR . 'before_restore_' . now()->format('Ymd_His') . '.sqlite';
        if (is_file($database) && ! File::copy($database, $safetyCopy)) {
            $this->error('تعذر إنشاء نسخة الأمان قبل الاستعادة؛ لم يتم تغيير قاعدة البيانات.');
            return self::FAILURE;
        }

        DB::disconnect();
        if (! File::copy($backup, $database)) {
            $this->error('تعذر استعادة النسخة. نسخة الأمان محفوظة في: ' . $safetyCopy);
            return self::FAILURE;
        }
        DB::purge();

        $this->info('تمت الاستعادة بنجاح.');
        $this->line('نسخة الأمان قبل الاستعادة: ' . $safetyCopy);
        return self::SUCCESS;
    }
}
