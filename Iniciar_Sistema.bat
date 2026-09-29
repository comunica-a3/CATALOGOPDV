@echo off

title Sistema Grafica PDV e ERP - Dumorro

echo ===================================================================
echo     INICIANDO SISTEMA COMERCIAL GRAFICA PDV E ERP [LOCAL]
echo ===================================================================
echo.

REM Garante que o diretorio de execucao seja a pasta onde este arquivo .bat esta localizado
cd /d "%~dp0"

echo [1/3] Verificando ambiente Node.js...

REM Verifica se o comando node responde
node -v >nul 2>nul
if %errorlevel% equ 0 goto :node_ok

REM Adiciona caminhos padroes ao PATH se o Node estiver instalado mas fora do PATH
if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "C:\Program Files (x86)\nodejs\node.exe" set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"
if exist "%APPDATA%\npm\node.exe" set "PATH=%APPDATA%\npm;%PATH%"

REM Testa o node novamente
node -v >nul 2>nul
if %errorlevel% equ 0 goto :node_ok

REM Verifica se possui o Bun instalado caso nao possua Node
bun -v >nul 2>nul
if %errorlevel% equ 0 goto :bun_ok

echo.
echo ===================================================================
echo [ERRO] O Node.js nao foi detectado neste computador!
echo ===================================================================
echo Para que o sistema funcione localmente, eh necessario ter o Node.js:
echo 1. Acesse: https://nodejs.org
echo 2. Baixe e instale a versao recomendada (LTS).
echo 3. Apos instalar, execute este arquivo Iniciar_Sistema.bat novamente.
echo.
goto :pausar_fim

:bun_ok
set "GERENCIADOR=bun"
goto :preparar_dados

:node_ok
set "GERENCIADOR=npm"
goto :preparar_dados

:preparar_dados
echo [2/3] Verificando pastas e dependencias...

REM Cria pastas essenciais de dados se nao existirem
if not exist "data" mkdir "data"
if not exist "data\uploads" mkdir "data\uploads"
if not exist "data\backups" mkdir "data\backups"

REM Se nao existir node_modules ou o executavel do tsx, faz a instalacao
if not exist "node_modules\" goto :instalar_dependencias
if not exist "node_modules\.bin\tsx" if not exist "node_modules\.bin\tsx.cmd" goto :instalar_dependencias
goto :iniciar_sistema

:instalar_dependencias
echo.
echo [INFO] Instalando dependencias necessarias do sistema...
echo Isso eh feito automaticamente na primeira vez e pode levar alguns instantes.
echo.
if "%GERENCIADOR%"=="bun" (
    call bun install
) else (
    call npm install
)

if %errorlevel% neq 0 (
    echo.
    echo ===================================================================
    echo [ERRO] Falha ao instalar as dependencias via %GERENCIADOR%.
    echo Verifique sua conexao com a internet e tente novamente.
    echo ===================================================================
    goto :pausar_fim
)
echo.
echo [OK] Dependencias instaladas com sucesso!
echo.

:iniciar_sistema
echo [3/3] Iniciando o servidor do sistema...
echo.
echo ===================================================================
echo   Link de Acesso Local: http://localhost:3000
echo   Banco de Dados SQLite: data/pdv_database.sqlite
echo   Pasta de Uploads: data/uploads/
echo.
echo   O navegador padrao sera aberto em alguns segundos...
echo   Para encerrar o sistema, feche esta janela ou aperte CTRL + C.
echo ===================================================================
echo.

REM Abre o navegador automaticamente em segundo plano apos 3 segundos
start "" cmd /c "ping 127.0.0.1 -n 4 >nul & start http://localhost:3000"

REM Inicia a aplicacao
if "%GERENCIADOR%"=="bun" (
    call bun run dev
) else (
    call npm run dev
)

echo.
echo ===================================================================
echo [AVISO] O servidor foi finalizado ou parou de responder.
echo Codigo de saida: %errorlevel%
echo ===================================================================

:pausar_fim
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
