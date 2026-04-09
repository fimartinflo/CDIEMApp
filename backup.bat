@echo off
:: ============================================================
:: backup.bat — Backup manual de la base de datos CDIEM
::
:: Copia database.sqlite a backups\backup_YYYYMMDD_HHMMSS.sqlite
:: Conserva los últimos 7 backups (elimina los más antiguos).
::
:: Uso: doble clic en backup.bat  (o desde línea de comandos)
:: ============================================================

setlocal EnableDelayedExpansion

set DB_FILE=%~dp0database.sqlite
set BACKUP_DIR=%~dp0backups

:: Verificar que existe la base de datos
if not exist "%DB_FILE%" (
    echo [ERROR] No se encontro database.sqlite en %~dp0
    echo         Asegurese de haber ejecutado instalar.bat primero.
    pause
    exit /b 1
)

:: Crear carpeta de backups si no existe
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Construir timestamp YYYYMMDD_HHMMSS
set YYYY=%DATE:~6,4%
set MM=%DATE:~3,2%
set DD=%DATE:~0,2%
set HH=%TIME:~0,2%
set MN=%TIME:~3,2%
set SS=%TIME:~6,2%

:: Eliminar espacios del timestamp (hora < 10 aparece con espacio en Windows)
set HH=%HH: =0%

set STAMP=%YYYY%%MM%%DD%_%HH%%MN%%SS%
set DEST=%BACKUP_DIR%\backup_%STAMP%.sqlite

:: Copiar
copy /Y "%DB_FILE%" "%DEST%" >nul
if errorlevel 1 (
    echo [ERROR] No se pudo crear el backup.
    pause
    exit /b 1
)

echo [OK] Backup creado: backups\backup_%STAMP%.sqlite

:: Purgar backups antiguos — conservar solo los 7 mas recientes
set COUNT=0
for /f "delims=" %%F in ('dir /b /o-n "%BACKUP_DIR%\backup_*.sqlite" 2^>nul') do (
    set /a COUNT+=1
    if !COUNT! gtr 7 (
        del "%BACKUP_DIR%\%%F" >nul
        echo [OK] Backup antiguo eliminado: %%F
    )
)

echo.
echo Backup completado exitosamente.
echo Los backups se guardan en: %BACKUP_DIR%
echo.
pause
