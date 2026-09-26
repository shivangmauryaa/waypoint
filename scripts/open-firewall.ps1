$ErrorActionPreference = 'Stop'
$taskIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
$taskPrincipal = New-Object Security.Principal.WindowsPrincipal($taskIdentity)
if (-not $taskPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Open PowerShell as Administrator, then run this script again.'
}
$taskRuleName = 'Waypoint-Travel-Demo-TCP-3001'
$taskNode = (Get-Command node.exe).Source
if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress '192.168.1.105' -ErrorAction SilentlyContinue)) {
    throw 'This PC no longer has 192.168.1.105. Update the rule and router forwarding to its current Wi-Fi address first.'
}
if (Get-NetFirewallRule -Name $taskRuleName -ErrorAction SilentlyContinue) {
    Write-Output 'Waypoint firewall rule already exists. No changes made.'
} else {
    New-NetFirewallRule -Name $taskRuleName -DisplayName 'Waypoint travel demo - TCP 3001' -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001 -LocalAddress '192.168.1.105' -Program $taskNode -Profile Any | Out-Null
    Write-Output 'Allowed inbound TCP 3001 for Node.js on 192.168.1.105.'
}
Write-Output 'Router rule still required: WAN TCP 3001 -> 192.168.1.105 TCP 3001.'
Write-Output 'To undo the firewall rule: Remove-NetFirewallRule -Name Waypoint-Travel-Demo-TCP-3001'
