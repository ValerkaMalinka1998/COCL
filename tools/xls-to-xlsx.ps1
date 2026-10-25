# Пересохраняет все .xls из папки в .xlsx рядом с ними (нужен установленный Excel).
# Запуск: powershell -ExecutionPolicy Bypass -File tools\xls-to-xlsx.ps1 "D:\папка с бланками"
param([Parameter(Mandatory = $true)][string]$Folder)

$excel = New-Object -ComObject Excel.Application
$excel.DisplayAlerts = $false
try {
  # -Filter *.xls в Windows цепляет и .xlsx — отсекаем по расширению
  Get-ChildItem -LiteralPath $Folder -Filter *.xls | Where-Object { $_.Extension -eq '.xls' } | ForEach-Object {
    $out = [IO.Path]::ChangeExtension($_.FullName, '.xlsx')
    $wb = $excel.Workbooks.Open($_.FullName, 0, $true)
    $wb.SaveAs($out, 51)
    $wb.Close($false)
    Write-Output "OK  $($_.Name)"
  }
} finally {
  $excel.Quit()
}
