import express from "express";
import http from "node:http";
import { resolve } from "node:path";

const app = express();
const dist = resolve("dist-mobile");

app.use("/api", (req, res) => {
  const headers = { ...req.headers, host: "127.0.0.1:3001" };
  delete headers.origin;
  const proxy = http.request({
    hostname: "127.0.0.1",
    port: 3001,
    path: req.originalUrl,
    method: req.method,
    headers,
  }, (upstream) => {
    res.writeHead(upstream.statusCode || 502, upstream.headers);
    upstream.pipe(res);
  });
  proxy.on("error", (error) => res.status(502).json({ error: `Waypoint API is unavailable: ${error.message}` }));
  req.pipe(proxy);
});

app.use(express.static(dist, { index: false, fallthrough: true }));
app.get("/{*path}", (_req, res) => res.sendFile(resolve(dist, "index.html")));

const port = Number(process.env.MOBILE_PORT || 8011);
app.listen(port, "0.0.0.0", () => {
  console.log(`Waypoint mobile is available on port ${port}. Use this computer's Wi-Fi IPv4 address from another device.`);
});
