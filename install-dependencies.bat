@echo off
echo Installing missing dependencies for Internship ERP...
echo.
echo This will install:
echo - bcrypt (password hashing)
echo - jsonwebtoken (JWT tokens)
echo - helmet (security headers)
echo - express-rate-limit (rate limiting)
echo - googleapis (Google Sheets)
echo - nodemailer (email service)
echo.
echo Please wait...
echo.

npm install bcrypt jsonwebtoken @types/bcrypt @types/jsonwebtoken helmet express-rate-limit @types/helmet @types/express-rate-limit googleapis @types/googleapis nodemailer @types/nodemailer

echo.
if errorlevel 1 (
    echo ERROR: Installation failed!
    echo Please make sure you are running this from Command Prompt NOT PowerShell
    pause
    exit /b 1
) else (
    echo.
    echo SUCCESS: All dependencies installed!
    echo.
    echo You can now run: npm run dev
    echo.
    pause
)
