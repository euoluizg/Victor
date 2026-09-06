@echo off
echo =========================================
echo    INICIANDO O BOT DE VOTACAO (WAHA)
echo =========================================
echo.
echo Preparando para iniciar os conteineres...
docker compose up -d
echo.
echo =========================================
echo ✅ O Bot foi iniciado com sucesso! 
echo Ele esta rodando invisivel em segundo plano.
echo.
echo Se for a primeira vez, lembre-se de acessar
echo http://localhost:3000 para ler o QR Code!
echo =========================================
pause
