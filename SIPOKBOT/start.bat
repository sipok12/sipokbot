@echo off
cd /d "%~dp0"
if not exist .env (
  echo ERREUR : le fichier .env est absent.
  echo Copiez .env.example vers .env puis ajoutez votre cle Gemini.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installation des dependances...
  call npm install
  if errorlevel 1 (
    echo Echec de npm install.
    pause
    exit /b 1
  )
)
echo Demarrage de SIPOKBOT...
call npm start
pause
