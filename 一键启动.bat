@echo off
chcp 65001 > nul
title 🐧 企鹅艾洛魔法世界 - 一键启动器
powershell -ExecutionPolicy Bypass -File "%~dp0start-all.ps1"
pause
