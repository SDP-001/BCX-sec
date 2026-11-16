@echo off
setlocal

set "APP_DIR=%~dp0"
set "BACKEND_DIR=%APP_DIR%backend"
set "FRONTEND_DIR=%APP_DIR%frontend"

where java >nul 2>nul
if errorlevel 1 goto missing_java
where npm >nul 2>nul
if errorlevel 1 goto missing_node
where curl.exe >nul 2>nul
if errorlevel 1 goto missing_curl

if not exist "%FRONTEND_DIR%\node_modules\vite\bin\vite.js" (
  echo Installing frontend dependencies on first run...
  pushd "%FRONTEND_DIR%"
  call npm ci
  if errorlevel 1 (
    popd
    echo Frontend dependency installation failed.
    pause
    exit /b 1
  )
  popd
)

curl.exe -fsS --max-time 2 "http://127.0.0.1:5002/api/v1/health" 2>nul | findstr /C:bytecodx-api >nul
if errorlevel 1 start "Bytecodx API" /D "%BACKEND_DIR%" cmd /k "mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=demo"

set "WAIT_COUNT=0"
:wait_backend
curl.exe -fsS --max-time 2 "http://127.0.0.1:5002/api/v1/health" 2>nul | findstr /C:bytecodx-api >nul
if not errorlevel 1 goto backend_ready
set /a WAIT_COUNT+=1
if %WAIT_COUNT% geq 60 goto backend_timeout
timeout /t 2 /nobreak >nul
goto wait_backend

:backend_ready
curl.exe -fsS --max-time 2 "http://127.0.0.1:5173/" 2>nul | findstr /C:Bytecodx >nul
if errorlevel 1 start "Bytecodx Frontend" /D "%FRONTEND_DIR%" cmd /k "npm run dev -- --host 127.0.0.1"

set "WAIT_COUNT=0"
:wait_frontend
curl.exe -fsS --max-time 2 "http://127.0.0.1:5173/" 2>nul | findstr /C:Bytecodx >nul
if not errorlevel 1 goto frontend_ready
set /a WAIT_COUNT+=1
if %WAIT_COUNT% geq 60 goto frontend_timeout
timeout /t 2 /nobreak >nul
goto wait_frontend

:frontend_ready
start "" "http://127.0.0.1:5173"
echo Bytecodx is running at http://127.0.0.1:5173
exit /b 0

:backend_timeout
echo The API did not become healthy. Check the Bytecodx API window for errors.
pause
exit /b 1

:frontend_timeout
echo The frontend did not become ready. Check the Bytecodx Frontend window for errors.
pause
exit /b 1

:missing_java
echo Java 21 or later is required. Install a JDK and add java to PATH.
pause
exit /b 1

:missing_node
echo Node.js and npm are required. Install Node.js LTS and add npm to PATH.
pause
exit /b 1

:missing_curl
echo curl.exe is required. Use a current Windows 10 or Windows 11 installation.
pause
exit /b 1
