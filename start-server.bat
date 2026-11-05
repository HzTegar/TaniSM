@echo off
REM ============================================================
REM  Tani.SM - Server Launcher
REM  Klik 2x file ini setiap mau buka webnya.
REM  Jendela ini HARUS dibiarkan terbuka.
REM  Cara tutup: tekan Ctrl+C di jendela ini, atau tutup jendelanya.
REM ============================================================

title Tani.SM Server (jangan ditutup selama web dipakai)

cd /d "%~dp0"

REM --- Cek Node.js sudah ada belum -----------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  [X] Node.js belum terinstall.
  echo      Download di: https://nodejs.org  (pilih versi LTS)
  echo      Sudah terinstall? tutup jendela ini, buka CMD baru, lalu jalankan: node -v
  echo.
  pause
  exit /b 1
)

REM --- Kalau port 8080 sudah dipakai, berarti server sudah hidup ------
REM Tidak perlu nyalakan dua kali: cukup buka yang sudah ada.
netstat -ano | findstr /r /c:"LISTENING" | findstr ":8080 " >nul
if not errorlevel 1 (
  echo.
  echo  Server Tani.SM sudah jalan di port 8080.
  echo  Membuka http://localhost:8080
  echo.
  echo  Jendela CMD yang kedua ini boleh ditutup.
  echo.
  start "" "http://localhost:8080"
  timeout /t 4 >nul
  exit /b 0
)

echo.
echo  Memulai Tani.SM di port 8080 ...
echo  Tunggu sebentar, lalu buka:  http://localhost:8080
echo.

start "" "http://localhost:8080"

REM --- Jalankan server (jendela ini yang ngejaga) ------------------
node dev-server.js

echo.
echo  Server dihentikan. Tekan tombol apa saja untuk menutup.
pause >nul
