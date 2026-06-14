@echo off
echo Starting Xeno CRM...

echo [1/3] Starting CRM Backend on port 8000...
start "CRM Backend" cmd /k "cd /d D:\coding\xeno\backend && set PYTHONPATH=D:\coding\xeno\backend && D:\coding\xeno\venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Channel Service on port 8001...
start "Channel Service" cmd /k "cd /d D:\coding\xeno\channel_service && set PYTHONPATH=D:\coding\xeno\channel_service && D:\coding\xeno\venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8001 --reload"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Frontend on port 5173...
start "Frontend" cmd /k "cd /d D:\coding\xeno\frontend && npm run dev"

echo.
echo All services starting...
echo   Frontend:        http://localhost:5173
echo   CRM Backend:     http://localhost:8000
echo   Channel Service: http://localhost:8001
echo   API Docs:        http://localhost:8000/docs
