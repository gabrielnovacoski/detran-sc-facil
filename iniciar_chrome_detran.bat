@echo off
echo ===================================================
echo   SOLUCAO DEFINITIVA - NOVO PERFIL
echo ===================================================
echo.
echo O Chrome principal esta bloqueando o robo. 
echo Vamos abrir um Chrome "limpo" apenas para o Detran.
echo.
echo IMPORTANTE:
echo Voce tera que fazer LOGIN novamente neste Chrome que vai abrir.
echo.

md "C:\ChromeDetranBot" >nul 2>&1

echo Iniciando Chrome Isolado (Porta 9222)...

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\ChromeDetranBot"

echo.
echo ===================================================
echo   AGORA VAI FUNCIONAR!
echo ===================================================
echo.
echo 1. O Chrome abriu 'zerado'.
echo 2. ENTRE NO SITE DO DETRAN E FACA LOGIN NELE.
echo 3. Volte ao aplicativo e consulte.
echo.
pause
