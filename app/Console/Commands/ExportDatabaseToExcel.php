<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Throwable;

class ExportDatabaseToExcel extends Command
{
    protected $signature = 'database:export-excel
        {--local-only : إنشاء ملفات Excel محليًا دون رفعها إلى Google Drive}
        {--table=* : تصدير جداول محددة فقط}';

    protected $description = 'تصدير جداول قاعدة البيانات إلى ملفات Excel ورفعها إلى Google Drive عند تفعيل الربط';

    public function handle(): int
    {
        if (!config('database_backup.enabled')) {
            $this->warn('تصدير قاعدة البيانات متوقف من الإعدادات.');
            return self::SUCCESS;
        }

        try {
            $tables = $this->tablesToExport();
            if ($tables === []) {
                throw new \RuntimeException('لم يتم العثور على جداول قابلة للتصدير.');
            }

            $googleEnabled = config('database_backup.google_drive.enabled') && !$this->option('local-only');
            $timestamp = now()->format('Ymd_His');
            $uploaded = 0;

            foreach ($tables as $table) {
                $path = $this->createTableWorkbook($table, $timestamp);
                $this->info("تم إنشاء {$table}: {$path}");
                Log::info('Database Excel table backup created', ['table' => $table, 'path' => $path]);

                if ($googleEnabled) {
                    $fileId = $this->uploadToGoogleDrive($path);
                    $uploaded++;
                    $this->line("تم رفع {$table} إلى Google Drive. File ID: {$fileId}");
                    Log::info('Database Excel table backup uploaded', [
                        'table' => $table,
                        'path' => $path,
                        'file_id' => $fileId,
                    ]);
                }

                unset($path);
                gc_collect_cycles();
            }

            $this->info(sprintf(
                'اكتمل تصدير %d جدولًا%s.',
                count($tables),
                $googleEnabled ? " ورفع {$uploaded} ملفًا إلى Google Drive" : ' محليًا فقط'
            ));
            return self::SUCCESS;
        } catch (Throwable $exception) {
            Log::error('Database Excel backup failed', [
                'message' => $exception->getMessage(),
                'exception' => get_class($exception),
            ]);
            $this->error('فشل تصدير قاعدة البيانات إلى Excel: ' . $exception->getMessage());
            return self::FAILURE;
        }
    }

    private function createTableWorkbook(string $table, string $timestamp): string
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($this->uniqueSheetTitle($table));

        $rows = DB::table($table)->get();
        $headers = $rows->isNotEmpty()
            ? array_keys((array) $rows->first())
            : $this->tableColumns($table);

        if ($headers === []) {
            $headers = ['message'];
            $rows = collect([(object) ['message' => 'لا توجد سجلات في هذا الجدول']]);
        }

        foreach ($headers as $columnIndex => $header) {
            $sheet->setCellValue(Coordinate::stringFromColumnIndex($columnIndex + 1) . '1', $header);
        }

        $lastColumn = Coordinate::stringFromColumnIndex(max(1, count($headers)));
        $sheet->getStyle("A1:{$lastColumn}1")->getFont()->setBold(true);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter("A1:{$lastColumn}1");

        foreach ($rows as $rowIndex => $row) {
            $values = (array) $row;
            foreach ($headers as $columnIndex => $header) {
                $value = $values[$header] ?? null;
                if (in_array(strtolower((string) $header), $this->redactedColumns(), true)) {
                    $value = '[محجوب]';
                }
                if (is_bool($value)) {
                    $value = $value ? '1' : '0';
                }
                $sheet->setCellValue(
                    Coordinate::stringFromColumnIndex($columnIndex + 1) . ($rowIndex + 2),
                    $value
                );
            }
        }

        foreach ($headers as $columnIndex => $header) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($columnIndex + 1))->setAutoSize(true);
        }

        $disk = config('database_backup.disk', 'local');
        $directory = trim(config('database_backup.directory', 'backups/database'), '/');
        $safeTable = preg_replace('/[^A-Za-z0-9_-]+/', '_', $table) ?: 'table';
        $filename = "procurement_database_{$timestamp}_{$safeTable}.xlsx";
        Storage::disk($disk)->makeDirectory($directory);
        $relativePath = $directory . '/' . $filename;
        $absolutePath = Storage::disk($disk)->path($relativePath);

        (new Xlsx($spreadsheet))->save($absolutePath);
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet, $sheet, $rows);

        return $absolutePath;
    }

    private function redactedColumns(): array
    {
        return ['password', 'remember_token', 'token', 'refresh_token', 'client_secret', 'api_token', 'secret'];
    }

    private function filterExcludedTables(array $tables): array
    {
        $excluded = array_values(array_filter(array_map('trim', explode(',', (string) config('database_backup.exclude_tables', '')))));
        return array_values(array_filter($tables, fn (string $table): bool => !in_array($table, $excluded, true)));
    }

    private function tableColumns(string $table): array
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => collect(DB::select("PRAGMA table_info('" . str_replace("'", "''", $table) . "')"))
                ->pluck('name')->all(),
            'mysql' => collect(DB::select('SHOW COLUMNS FROM `' . str_replace('`', '``', $table) . '`'))
                ->pluck('Field')->all(),
            'pgsql' => collect(DB::select(
                'SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? ORDER BY ordinal_position',
                ['public', $table]
            ))->pluck('column_name')->all(),
            default => [],
        };
    }

    private function tablesToExport(): array
    {
        $requested = $this->option('table');
        if ($requested !== []) {
            return array_values(array_filter(array_unique($requested), function (string $table): bool {
                return DB::getSchemaBuilder()->hasTable($table);
            }));
        }

        $configured = trim((string) config('database_backup.include_tables', ''));
        if ($configured !== '') {
            return array_values(array_filter(array_map('trim', explode(',', $configured))));
        }

        return $this->filterExcludedTables(match (DB::connection()->getDriverName()) {
            'sqlite' => collect(DB::select("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"))
                ->pluck('name')->all(),
            'mysql' => collect(DB::select('SHOW TABLES'))
                ->map(fn (object $row) => array_values((array) $row)[0])->all(),
            'pgsql' => collect(DB::select("SELECT tablename AS name FROM pg_catalog.pg_tables WHERE schemaname = 'public' ORDER BY tablename"))
                ->pluck('name')->all(),
            default => throw new \RuntimeException('نوع قاعدة البيانات غير مدعوم للتصدير التلقائي.'),
        });
    }

    private function uniqueSheetTitle(string $table): string
    {
        $title = str_replace(['\\', '/', '*', '?', ':', '[', ']'], '_', $table) ?: 'table';
        return mb_substr($title, 0, 31);
    }

    private function uploadToGoogleDrive(string $path): string
    {
        $config = config('database_backup.google_drive');
        foreach (['folder_id', 'client_id', 'client_secret', 'refresh_token'] as $key) {
            if (empty($config[$key])) {
                throw new \RuntimeException("إعداد Google Drive مفقود: {$key}");
            }
        }

        $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => $config['client_id'],
            'client_secret' => $config['client_secret'],
            'refresh_token' => $config['refresh_token'],
            'grant_type' => 'refresh_token',
        ])->throw()->json();

        $accessToken = $tokenResponse['access_token'] ?? null;
        if (!$accessToken) {
            throw new \RuntimeException('لم يتم الحصول على Access Token من Google.');
        }

        $boundary = 'procurement_backup_' . bin2hex(random_bytes(12));
        $metadata = json_encode([
            'name' => basename($path),
            'parents' => [$config['folder_id']],
            'mimeType' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $content = file_get_contents($path);
        if ($content === false) {
            throw new \RuntimeException('تعذر قراءة ملف Excel قبل الرفع.');
        }

        $body = "--{$boundary}\r\n"
            . "Content-Type: application/json; charset=UTF-8\r\n\r\n"
            . $metadata . "\r\n"
            . "--{$boundary}\r\n"
            . "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n"
            . $content . "\r\n"
            . "--{$boundary}--";

        return (string) Http::withToken($accessToken)
            ->withHeaders(['Content-Type' => "multipart/related; boundary={$boundary}"])
            ->withBody($body, "multipart/related; boundary={$boundary}")
            ->post('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name')
            ->throw()
            ->json('id');
    }
}

