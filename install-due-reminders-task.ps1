param(
    [string]$PhpPath = 'C:\xampp\php\php.exe'
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$workerPath = Join-Path $projectRoot 'api\due-reminders-worker.php'
if (-not (Test-Path -LiteralPath $PhpPath -PathType Leaf)) {
    throw "PHP tidak ditemukan di '$PhpPath'. Jalankan skrip dengan -PhpPath jika XAMPP berada di lokasi lain."
}
if (-not (Test-Path -LiteralPath $workerPath -PathType Leaf)) {
    throw "Worker pengingat tidak ditemukan: $workerPath"
}

$action = New-ScheduledTaskAction -Execute $PhpPath -Argument ('"{0}"' -f $workerPath) -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '8:00 AM'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Limited
try {
    Register-ScheduledTask -TaskName 'Nusa Karsa - Pengingat Jatuh Tempo' -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Memeriksa tagihan Nusa Karsa setiap hari dan membuat notifikasi aplikasi.' -Force | Out-Null
} catch {
    throw "Tidak dapat memasang Task Scheduler: $($_.Exception.Message)"
}
Write-Output 'Scheduler terpasang untuk berjalan setiap hari pukul 08.00 waktu Windows.'
Write-Output 'Pastikan MySQL tersedia dan database/migration_add_due_notifications.sql sudah dijalankan.'
