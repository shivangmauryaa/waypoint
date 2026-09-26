# Cloudflare quick tunnel

Share the running app over a temporary public HTTPS URL while the server stays on this PC. No Cloudflare account is required.

1. Download `cloudflared` once (from the official Cloudflare release page) and put it somewhere on `PATH`, or in this folder.
2. Start the app with tunnel-aware config, then start the tunnel:

```powershell
npm.cmd run start:tunnel
cloudflared tunnel --url http://127.0.0.1:3001
```

3. `cloudflared` prints a `https://<random>.trycloudflare.com` URL. Open that from any device.

`npm run start:tunnel` loads `.env.tunnel`, which sets `HOST=127.0.0.1` and `TRUST_TUNNEL=1`. `TRUST_TUNNEL` lets the API accept write requests whose browser `Origin` is a `*.trycloudflare.com` URL, so login and edits work through the tunnel. Without it the API rejects those writes with `Origin not allowed`.

The URL is temporary and changes every time the tunnel restarts. Keep this PC awake and both processes running. All data still lives in `data/store.json` on this machine; nothing is uploaded. Demo accounts are reachable through the tunnel, so do not share real travel records.

---

# Direct IP access

This setup uses your own internet connection, not a hosted URL or tunnel.

Detected addresses (they can change):

- PC Wi-Fi: `192.168.1.105`
- Public outbound IP: `45.114.249.94`
- Application port: TCP `3001`

## Start the network listener

```powershell
npm.cmd run start:network
```

The generated, gitignored `.env.network` binds the app to `0.0.0.0:3001` and permits browser requests from the explicit LAN/public URLs. `PUBLIC_MODE=1` restricts administrator and built-in demo accounts to loopback requests. Access admin locally at `http://127.0.0.1:3001/admin`. Remote users must create their own traveler accounts. This does not expose the JSON file as a downloadable static file.

## Windows firewall

Open PowerShell **as Administrator**, then run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\Welcome\Desktop\New folder\scripts\open-firewall.ps1"
```

The process-level execution-policy option does not change your system execution policy. The script creates one app-specific inbound rule for Node.js, TCP port 3001, on this PC's Wi-Fi address. It does not turn off Windows Firewall.

## Router forwarding

In your router's administration page, create a port-forward / virtual-server rule:

| Setting | Value |
| --- | --- |
| Protocol | TCP |
| External/WAN port | 3001 |
| Internal/LAN address | 192.168.1.105 |
| Internal/LAN port | 3001 |

Reserve `192.168.1.105` for this PC in the router's DHCP settings so the rule keeps pointing at the right device. Do not enable a DMZ or open unrelated ports.

After both rules are active, test **http://45.114.249.94:3001** from a phone on mobile data with Wi-Fi turned off. A request from this PC cannot establish whether a remote internet visitor can connect. Some routers also lack NAT loopback.

If the router's WAN address differs from `45.114.249.94`, the connection may have another NAT layer or ISP CGNAT. Ordinary port forwarding may not be enough; ask the ISP for an inbound-reachable public IPv4 address. A VPN can also change the detected outbound IP.

## Scope and shutdown

This is HTTP sharing for a demonstration, not an HTTPS production deployment. Do not use real travel records or reused passwords. For real accounts, add TLS with a trusted certificate and production delivery/infrastructure before collecting sensitive data.

Keep this PC awake and the Node server running. Public IP changes require updating `.env.network` and the shared URL. Stop the server to stop serving the app. To remove the Windows firewall exception, run as Administrator:

```powershell
Remove-NetFirewallRule -Name 'Waypoint-Travel-Demo-TCP-3001'
```

Also remove the router's forwarding rule when no longer needed.
