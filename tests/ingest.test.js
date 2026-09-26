import test from "node:test";
import assert from "node:assert/strict";
import { parseConfirmation, extractPdf } from "../server/ingest.js";
test("structured confirmation extracts explicit fields", () => {
  const r = parseConfirmation(
    "Title: Test flight\nType: flight\nPrice: INR 4,200\nStart: 2026-10-12T08:00:00+05:30\nEnd: 2026-10-12T09:00:00+05:30\nRefund: 75%",
  );
  assert.equal(r.drafts[0].price, 4200);
  assert.equal(r.drafts[0].refund, 0.75);
  assert.equal(r.drafts[0].start, "2026-10-12T02:30:00.000Z");
});
test("UTC calendar import preserves absolute timestamps", () => {
  const r = parseConfirmation(
    "BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Walking tour\nDTSTART:20261012T070000Z\nDTEND:20261012T080000Z\nLOCATION:Jaipur\nEND:VEVENT\nEND:VCALENDAR",
  );
  assert.equal(r.drafts[0].title, "Walking tour");
  assert.equal(r.drafts[0].start, "2026-10-12T07:00:00.000Z");
});
test("unsupported calendar timezone is rejected explicitly", () =>
  assert.throws(
    () =>
      parseConfirmation(
        "BEGIN:VEVENT\nDTSTART;TZID=Europe/London:20261012T080000\nEND:VEVENT",
      ),
    /timezone/,
  ));
test("PDF import extracts text locally", async () => {
  const stream = "BT /F1 12 Tf 50 740 Td (Title: Jaipur tour) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((n) => String(n).padStart(10, "0") + " 00000 n ")
    .join(
      "\n",
    )}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  assert.match(
    await extractPdf(Buffer.from(pdf).toString("base64")),
    /Jaipur tour/,
  );
});
