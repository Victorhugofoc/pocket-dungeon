# Abre o jogo (menu do protótipo) numa janela. Uso: .\tools\play.ps1
$godot = "C:\Users\victo\Documents\Godot_v4.7.2-stable_win64.exe"
$root = Split-Path -Parent $PSScriptRoot
& $godot --headless --path $root --import 2>&1 | Out-Null
Start-Process -FilePath $godot -ArgumentList @("--path", "`"$root`"")
