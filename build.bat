@echo off
cd /d "c:\Users\buyse\OneDrive\デスクトップ\Antigravity\Shopee Auto\project"
npm run build 2>&1 > build_output.txt
type build_output.txt
