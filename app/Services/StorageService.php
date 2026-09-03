<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class StorageService
{
    /**
     * Determine the active storage disk (prefers Cloudflare R2 if configured).
     */
    public static function disk(): string
    {
        if (config('filesystems.default') === 'r2' || config('filesystems.default') === 's3') {
            return config('filesystems.default');
        }

        if (env('CLOUDFLARE_R2_ACCESS_KEY_ID') && env('CLOUDFLARE_R2_BUCKET')) {
            return 'r2';
        }

        if (env('AWS_ACCESS_KEY_ID') && env('AWS_BUCKET')) {
            return 's3';
        }

        return 'public';
    }

    /**
     * Store an uploaded file to the active disk.
     */
    public static function storeUploadedFile(UploadedFile $file, string $directory = 'attachments'): array
    {
        $disk = self::disk();
        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $fileName = Str::slug(pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME)) . '_' . time() . '_' . Str::random(6) . '.' . $extension;
        
        $path = $file->storeAs($directory, $fileName, $disk);

        return [
            'disk' => $disk,
            'path' => $path,
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime_type' => $file->getClientMimeType() ?: $file->getMimeType(),
            'url' => self::url($path, $disk),
        ];
    }

    /**
     * Store base64 data to the active disk.
     */
    public static function storeBase64(string $base64Data, string $directory = 'receipts', ?string $customName = null): ?array
    {
        if (! preg_match('/^data:image\/(\w+);base64,/', $base64Data, $matches)) {
            return null;
        }

        $disk = self::disk();
        $extension = strtolower($matches[1]);
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }

        $data = substr($base64Data, strpos($base64Data, ',') + 1);
        $decoded = base64_decode($data);
        if ($decoded === false) {
            return null;
        }

        $fileName = 'receipt_' . time() . '_' . Str::random(8) . '.' . $extension;
        $path = rtrim($directory, '/') . '/' . $fileName;

        Storage::disk($disk)->put($path, $decoded);

        return [
            'disk' => $disk,
            'path' => $path,
            'name' => $customName ?: $fileName,
            'size' => strlen($decoded),
            'mime_type' => 'image/' . ($extension === 'jpg' ? 'jpeg' : $extension),
            'url' => self::url($path, $disk),
        ];
    }

    /**
     * Get the public URL for a stored file.
     */
    public static function url(?string $path, ?string $disk = null): ?string
    {
        if (! $path) {
            return null;
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        $disk = $disk ?: self::disk();

        if ($disk === 'r2' || $disk === 's3') {
            $r2PublicUrl = env('CLOUDFLARE_R2_URL', env('AWS_URL'));
            if ($r2PublicUrl) {
                return rtrim($r2PublicUrl, '/') . '/' . ltrim($path, '/');
            }
            try {
                return Storage::disk($disk)->url($path);
            } catch (\Throwable) {
                // fallback to local API streaming route if URL generation fails
            }
        }

        if ($disk === 'public') {
            return url('/storage/' . ltrim($path, '/'));
        }

        return null;
    }

    /**
     * Stream or download a file from any configured disk (R2, S3, Public, Local).
     */
    public static function streamResponse(
        string $path,
        ?string $fileName = null,
        ?string $mimeType = null,
        bool $download = false
    ): Response {
        $fileName = $fileName ?: basename($path);
        $mimeType = $mimeType ?: 'application/octet-stream';
        $disksToCheck = ['r2', 's3', 'public', 'local'];

        foreach ($disksToCheck as $disk) {
            try {
                if (Storage::disk($disk)->exists($path)) {
                    // For R2 / S3, if public URL is configured and we're inline viewing, we can redirect or stream
                    if (($disk === 'r2' || $disk === 's3') && ! $download) {
                        $publicUrl = env('CLOUDFLARE_R2_URL', env('AWS_URL'));
                        if ($publicUrl) {
                            return redirect()->away(rtrim($publicUrl, '/') . '/' . ltrim($path, '/'));
                        }
                    }

                    if ($download) {
                        return Storage::disk($disk)->download($path, $fileName, [
                            'Content-Type' => $mimeType,
                        ]);
                    }

                    return Storage::disk($disk)->response($path, $fileName, [
                        'Content-Type' => $mimeType,
                        'Content-Disposition' => 'inline; filename="' . $fileName . '"',
                    ]);
                }
            } catch (\Throwable) {
                continue;
            }
        }

        // Fallback checks in local filesystem paths
        $localPaths = [
            storage_path('app/public/' . $path),
            storage_path('app/private/' . $path),
            storage_path('app/' . $path),
            public_path('storage/' . $path),
            public_path($path),
        ];

        foreach ($localPaths as $localPath) {
            if (file_exists($localPath)) {
                return response()->file($localPath, [
                    'Content-Type' => $mimeType,
                    'Content-Disposition' => ($download ? 'attachment' : 'inline') . '; filename="' . $fileName . '"',
                ]);
            }
        }

        abort(404, 'الملف المطلوب غير موجود على الخادم أو التخزين السحابي.');
    }

    /**
     * Delete a file from all storage disks.
     */
    public static function delete(?string $path, ?string $disk = null): bool
    {
        if (! $path) {
            return false;
        }

        $deleted = false;
        $disks = $disk ? [$disk] : ['r2', 's3', 'public', 'local'];

        foreach ($disks as $d) {
            try {
                if (Storage::disk($d)->exists($path)) {
                    Storage::disk($d)->delete($path);
                    $deleted = true;
                }
            } catch (\Throwable) {
                continue;
            }
        }

        return $deleted;
    }
}
