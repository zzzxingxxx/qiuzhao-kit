@echo off
cd /d %~dp0
echo Starting qiuzhao-kit local server and web UI...
echo Server: http://127.0.0.1:8787
echo Web:    http://127.0.0.1:5173
call pnpm dev
