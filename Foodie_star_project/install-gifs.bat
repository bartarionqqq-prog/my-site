@echo off
chcp 65001 >nul
if not exist "public\assets\gif" mkdir "public\assets\gif"
if exist "maskot.gif" (
  copy /Y "maskot.gif" "public\assets\gif\maskot.gif" >nul
) else (
  echo Не найден maskot.gif в корне проекта.
)
if exist "anime-bocchi.gif" (
  copy /Y "anime-bocchi.gif" "public\assets\gif\anime-bocchi.gif" >nul
) else (
  echo Не найден anime-bocchi.gif в корне проекта.
)
echo.
echo Готово. Проверь файлы в public\assets\gif
pause
