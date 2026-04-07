@echo off
chcp 65001 >nul
echo ============================================
echo  CDIEMApp — Iniciando servidor
echo ============================================
echo.
echo  La aplicación estará disponible en:
echo    http://localhost:3001
echo.
echo  Abre esa dirección en tu navegador.
echo  Para detener el servidor, cierra esta ventana
echo  o ejecuta "detener.bat".
echo.
echo ============================================
echo.

set "APP_DIR=%~dp0"
set "APP_DIR=%APP_DIR:~0,-1%"

cd /d "%APP_DIR%\backend"
node src/app.js
