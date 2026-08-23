web: export PHP_CLI_SERVER_WORKERS=10 && php artisan migrate --force && (php artisan queue:work --sleep=1 --tries=3 &) && php artisan serve --host=0.0.0.0 --port=${PORT:-8080}
