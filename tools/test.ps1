# Roda a suíte de testes headless. Uso: .\tools\test.ps1 [filtro]
param([string]$Filter = "")
$godot = "C:\Users\victo\Documents\Godot_v4.7.2-stable_win64.exe"
$root = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $root ".godot"))) {
    & $godot --headless --path $root --import | Out-Null
}
if ($Filter) {
    & $godot --headless --path $root --script res://tools/run_tests.gd -- $Filter
} else {
    & $godot --headless --path $root --script res://tools/run_tests.gd
}
exit $LASTEXITCODE
