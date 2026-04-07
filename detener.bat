@echo off
chcp 65001 >nul
echo Deteniendo CDIEMApp...

:: Buscar y terminar el proceso node que esté escuchando en el puerto 3001
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo Terminando proceso PID %%p
    taskkill /F /PID %%p >nul 2>&1
)

echo Servidor detenido.
pause
