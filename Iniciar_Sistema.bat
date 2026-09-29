@echo off
setlocal EnableDelayedExpansion

:: Define título da janela
title "Sistema Grafica PDV e ERP - Dumorro"

echo ===================================================================
echo     INICIANDO SISTEMA COMERCIAL GRAFICA PDV E ERP (100%% LOCAL)
echo ===================================================================
echo.

:: Garante que o diretorio de execucao seja a pasta onde este arquivo .bat esta
cd /d "%~dp0"

:: Detecta se o Node.js esta no PATH ou em caminhos padroes conhecidos no Windows
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    if exist "C:\Program Files\nodejs\node.exe" (
        set "PATH=C:\Program Files\nodejs;!PATH!"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        set "PATH=C:\Program Files (x86)\nodejs;!PATH!"
    ) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "PATH=%LOCALAPPDATA%\Programs\nodejs;!PATH!"
    ) else if exist "%APPDATA%\npm\node.exe" (
        set "PATH=%APPDATA%\npm;!PATH!"
    )
)

:: Verifica novamente o Node.js apos tentar os caminhos comuns
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    :: Se nao tiver Node, verifica se existe o Bun instalado
    where bun >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set "RUNNER=bun"
    ) else (
        echo [ERRO] O Node.js nao foi encontrado no seu computador!
        echo.
        echo Para que o sistema funcione localmente, eh necessario ter o Node.js instalado.
        echo Baixe e instale a versao LTS em: https://nodejs.org/
        echo (Recomendado: reinicie o computador ou feche e abra o terminal apos instalar).
        echo.
        echo ===================================================================
        echo Pressione qualquer tecla para fechar...
        pause >nul
        exit /b 1
    )
) else (
    set "RUNNER=node"
)

:: Garante que as pastas de dados e uploads existam
if not exist "data" mkdir "data"
if not exist "data\uploads" mkdir "data\uploads"
if not exist "data\backups" mkdir "data\backups"

:: Verifica a pasta node_modules
if not exist "node_modules\" (
    echo [INFO] Primeira execucao detectada. Instalando dependencias necessarias...
    echo Aguarde, esse processo pode levar alguns minutos dependendo da sua conexao...
    echo.
    if "!RUNNER!"=="bun" (
        call bun install
    ) else (
        call npm install
    )
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [ERRO] Falha ao instalar dependencias do projeto.
        echo Verifique sua conexao com a internet e tente novamente.
        echo.
        echo Pressione qualquer tecla para fechar...
        pause >nul
        exit /b 1
    )
    echo [OK] Dependencias instaladas com sucesso!
    echo.
)

echo [OK] Ambiente verificado com sucesso.
echo [INFO] Servidor iniciando em: http://localhost:3000
echo [INFO] Banco de dados: data/pdv_database.sqlite
echo [INFO] Uploads e imagens: data/uploads/
echo.
echo ===================================================================
echo   O navegador sera aberto automaticamente em instantes...
echo   Para encerrar o sistema, feche esta janela ou aperte CTRL + C.
echo ===================================================================
echo.

:: Abre o navegador padrao apos 3 segundos em segundo plano
start "" cmd /c "ping 127.0.0.1 -n 4 >nul && start http://localhost:3000"

:: Executa a aplicacao
if "!RUNNER!"=="bun" (
    call bun run dev
) else (
    call npm run dev
)

:: Se o comando sair ou for interrompido, mantem a janela aberta para leitura de mensagens
echo.
echo ===================================================================
echo [INFO] O servidor foi encerrado ou parou de responder.
echo Codigo de saida: %ERRORLEVEL%
echo ===================================================================
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
