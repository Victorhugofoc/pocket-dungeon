# Roda a suíte de testes headless. Uso: .\tools\test.ps1 [filtro]
# O executável da Godot é de subsistema GUI: sem redirecionar, a saída se perde
# no console. Por isso toda saída passa por um pipe.
param([string]$Filter = "")
$godot = "C:\Users\victo\Documents\Godot_v4.7.2-stable_win64.exe"
$root = Split-Path -Parent $PSScriptRoot
# Reimporta sempre: atualiza o cache de class_name quando há scripts novos.
& $godot --headless --path $root --import 2>&1 | Out-Null
$testArgs = @("--headless", "--path", $root, "--script", "res://tools/run_tests.gd")
if ($Filter) { $testArgs += @("--", $Filter) }
& $godot @testArgs 2>&1 | ForEach-Object { "$_" } | Where-Object { $_ -notmatch "^Godot Engine v" }
exit $LASTEXITCODE
