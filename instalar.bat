@echo off
chcp 65001 >nul
echo ============================================
echo  CDIEMApp — Instalación inicial
echo ============================================
echo.

:: Verificar que Node.js esté instalado
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js no está instalado.
    echo.
    echo Descárgalo desde https://nodejs.org ^(versión LTS^) e instálalo.
    echo Luego vuelve a ejecutar este script.
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo Node.js %NODE_VER%: OK
echo.

:: Guardar la ruta del directorio donde está el script
set "APP_DIR=%~dp0"
set "APP_DIR=%APP_DIR:~0,-1%"

:: [1/4] Instalar dependencias del backend
echo [1/4] Instalando dependencias del servidor...
cd /d "%APP_DIR%\backend"
call npm install --omit=dev
if errorlevel 1 (
    echo.
    echo ERROR al instalar dependencias del servidor.
    pause
    exit /b 1
)
echo.

:: [2/4] Instalar dependencias del frontend
echo [2/4] Instalando dependencias de la interfaz...
cd /d "%APP_DIR%\frontend"
call npm install --omit=dev
if errorlevel 1 (
    echo.
    echo ERROR al instalar dependencias de la interfaz.
    pause
    exit /b 1
)
echo.

:: [3/4] Compilar el frontend
echo [3/4] Compilando la interfaz ^(puede tardar 2-3 minutos^)...
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR al compilar la interfaz.
    pause
    exit /b 1
)
echo.

:: [4/4] Inicializar la base de datos
echo [4/4] Inicializando la base de datos...
cd /d "%APP_DIR%\backend"
call npm run init-db
if errorlevel 1 (
    echo.
    echo ERROR al inicializar la base de datos.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Instalación completada con éxito.
echo.
echo  Para iniciar la aplicación, ejecuta:
echo    iniciar.bat
echo ============================================
echo.
pause
