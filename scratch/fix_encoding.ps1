$path = "d:\VS CODE\CL FOOD CR erp_backoffice\erp_backoffice\src\features\kds\components\MemberPlanner.tsx"
$content = Get-Content -Path $path
# Fix the broken parts (lines 500-640 approx)
# I will replace the known corrupted patterns with clean Thai
$content = $content -replace "喙€喔∴笝喔灌笚喔掂箞喔堗副喔斷箑喔复喔｀箤喔", "เมนูที่จัดเสิร์ฟ"
$content = $content -replace "喔⑧副喔囙箘喔∴箞喔∴傅喔佮覆喔｀抚喔侧竾喙佮笢喔權箑喔∴笝喔灌釜喙堗抚喔權竵喔ム覆喔", "ยังไม่มีแผนส่วนกลาง"
$content = $content -replace "喔∴阜喙夃腑喙€喔娻箟喔", "มื้อเช้า"
$content = $content -replace "喔∴阜喙夃腑喙€喔⑧箛喔", "มื้อเย็น"
$content = $content -replace "喔堗赋喔權抚喔", "จำนวน"
$content = $content -replace "喔浮喔侧涪喙€喔笗喔膏笧喔脆箑喔ㄠ俯", "หมายเหตุ"

# Re-save with UTF8
$content | Set-Content -Path $path -Encoding UTF8
