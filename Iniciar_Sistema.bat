@echo off
chcp 65001 >nul
title Sistema Gráfica PDV & ERP - Dumorro (100%% Local)

echo ===================================================================
echo     INICIANDO SISTEMA COMERCIAL GRÁFICA PDV & ERP (100%% LOCAL)
echo ===================================================================
echo.

:: Muda para a pasta onde o arquivo .bat está localizado
cd /d "%~dp0"

:: Verifica se o Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] O Node.js não foi encontrado no sistema!
    echo Por favor, instale o Node.js através de https://nodejs.org antes de continuar.
    echo.
    pause
    exit /b 1
)

:: Cria as pastas necessárias caso não existam
if not exist "data" mkdir "data"
if not exist "data\uploads" mkdir "data\uploads"
if not exist "data\backups" mkdir "data\backups"

:: Verifica se as dependências do projeto estão instaladas
if not exist "node_modules\" (
    echo [AVISO] Pasta node_modules não encontrada. Instalando dependências necessárias...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERRO] Falha ao instalar dependências.
        pause
        exit /b 1
    )
)

echo [OK] Dependências prontas.
echo [INFO] Iniciando servidor do sistema na porta 3000...
echo [INFO] Banco de dados: data/pdv_database.sqlite
echo [INFO] Imagens e uploads: data/uploads/
echo.

:: Abre o navegador automaticamente após 3 segundos
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Inicia a aplicação
call npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo [AVISO] O servidor parou com código de saída %ERRORLEVEL%.
    pause
)
