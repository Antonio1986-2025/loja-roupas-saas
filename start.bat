@echo off
echo.
echo ========================================
echo   California Store - Iniciar Local
echo ========================================
echo.

echo [1/3] Verificando Docker...
docker ps >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERRO: Docker Desktop nao esta rodando!
    echo.
    echo Por favor:
    echo 1. Abra o Docker Desktop
    echo 2. Aguarde ate ficar "Docker Desktop is running"
    echo 3. Execute este script novamente
    echo.
    pause
    exit /b 1
)
echo OK: Docker esta rodando!

echo.
echo [2/3] Subindo PostgreSQL (porta 5433)...
docker-compose up -d postgres
if errorlevel 1 (
    echo ERRO ao subir PostgreSQL!
    pause
    exit /b 1
)

echo.
echo [3/3] Aguardando banco iniciar...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo   Iniciando servidor...
echo ========================================
echo.
echo IMPORTANTE: Na primeira vez, execute:
echo   npm run db:seed
echo.
echo Acesse: http://localhost:3000
echo.
echo Login:
echo   Email: admin@demo.com
echo   Senha: admin123
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

call npm run dev
