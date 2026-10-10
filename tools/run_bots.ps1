# Roda os bots em paralelo e gera o relatório.
# Uso: .\tools\run_bots.ps1 [-Runs 200] [-Procs 14] [-Bots random,generic,counter] [-Seed 10000]
# Todos os bots jogam as MESMAS sementes (comparação pareada).
param(
    [int]$Runs = 200,
    [int]$Procs = 14,
    [string[]]$Bots = @("random", "generic", "counter"),
    [int]$Seed = 10000
)
$godot = "C:\Users\victo\Documents\Godot_v4.7.2-stable_win64.exe"
$root = Split-Path -Parent $PSScriptRoot
& $godot --headless --path $root --import 2>&1 | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$dir = Join-Path $root "reports\$stamp"
New-Item -ItemType Directory -Force $dir | Out-Null
$chunk = [Math]::Ceiling($Runs / $Procs)
$sw = [Diagnostics.Stopwatch]::StartNew()
foreach ($bot in $Bots) {
    $running = @()
    for ($p = 0; $p -lt $Procs; $p++) {
        $n = [Math]::Min($chunk, $Runs - $p * $chunk)
        if ($n -le 0) { break }
        $start = $Seed + $p * $chunk
        $out = Join-Path $dir "$bot`_$p.csv"
        $procArgs = @("--headless", "--path", "`"$root`"", "--script", "res://tools/sim_runner.gd", "--",
            "--bot", $bot, "--runs", $n, "--seed", $start, "--out", "`"$out`"")
        $running += Start-Process -FilePath $godot -ArgumentList $procArgs -NoNewWindow -PassThru `
            -RedirectStandardOutput (Join-Path $dir "$bot`_$p.log") -RedirectStandardError (Join-Path $dir "$bot`_$p.err")
    }
    $running | Wait-Process
    "{0}: {1} runs em {2:N0} s" -f $bot, $Runs, $sw.Elapsed.TotalSeconds
}
$all = Join-Path $dir "all.csv"
$first = $true
Get-ChildItem $dir -Filter "*_*.csv" | Sort-Object Name | ForEach-Object {
    $lines = Get-Content $_.FullName
    if ($first) { $lines | Set-Content -Encoding utf8 $all; $first = $false }
    else { $lines | Select-Object -Skip 1 | Add-Content -Encoding utf8 $all }
}
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [Text.Encoding]::UTF8
python -I (Join-Path $root "tools\bot_report.py") $all | Tee-Object -FilePath (Join-Path $dir "report.txt")
