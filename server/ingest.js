function timestamp(raw) {
  if (!raw) return undefined;
  const compact = raw.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/,
  );
  if (compact)
    raw = `${compact[1]}-${compact[2]}-${compact[3]}T${compact[4]}:${compact[5]}:${compact[6]}${compact[7] || "+05:30"}`;
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(raw)) raw = raw.replace(" ", "T") + "+05:30";
  return Number.isFinite(Date.parse(raw))
    ? new Date(raw).toISOString()
    : undefined;
}
export function parseConfirmation(text) {
  const drafts = [];
  if (text.includes("BEGIN:VEVENT")) {
    const unfolded = text.replace(/\r?\n[ \t]/g, "");
    for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
      const find = (k) =>
        block.match(new RegExp("(?:^|\\n)" + k + ":([^\\r\\n]+)"))?.[1];
      if (/DTSTART;TZID=/.test(block))
        throw Error(
          "This calendar uses a named timezone. Export UTC calendar times or enter the booking manually.",
        );
      drafts.push({
        title: find("SUMMARY")?.replaceAll("\\,", ",") || "Imported event",
        type: "event",
        start: timestamp(find("DTSTART")),
        end: timestamp(find("DTEND")),
        from: find("LOCATION") || "",
        to: find("LOCATION") || "",
        reference: find("UID")?.slice(0, 100) || "IMPORT",
        provider: "Calendar import",
        price: 0,
        refund: 0,
        dependencies: [],
      });
    }
  } else {
    const find = (...keys) => {
      for (const key of keys) {
        const match = text.match(
          new RegExp("(?:^|\\n)\\s*" + key + "\\s*[:=]\\s*([^\\r\\n]+)", "i"),
        );
        if (match) return match[1].trim();
      }
    };
    const start = timestamp(find("start", "departure", "check-in"));
    drafts.push({
      title: find("title", "booking", "subject") || "",
      type: find("type")?.toLowerCase() || "flight",
      provider: find("provider", "airline", "hotel") || "",
      reference: find("reference", "pnr", "confirmation") || "",
      from: find("from", "origin") || "",
      to: find("to", "destination") || "",
      start,
      end: timestamp(find("end", "arrival")),
      price:
        Number((find("price", "cost") || "0").replace(/[^0-9.]/g, "")) || 0,
      refund: (Number(find("refund")?.replace("%", "")) || 0) / 100,
      refundDeadline: timestamp(find("refund deadline")),
      dependencies: [],
    });
  }
  return {
    drafts: drafts.slice(0, 30).map((d) => ({
      ...d,
      type: [
        "flight",
        "train",
        "transfer",
        "hotel",
        "activity",
        "event",
      ].includes(d.type)
        ? d.type
        : "event",
    })),
    extractedText: text.slice(0, 20000),
    note: "Review every field before saving. Unrecognized or missing fields require manual entry. Floating times are interpreted as IST. No supplier confirmation is performed.",
  };
}
export async function extractPdf(base64) {
  const bytes = new Uint8Array(Buffer.from(base64, "base64"));
  if (bytes.length > 2000000) throw Error("PDF must be smaller than 2 MB");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: bytes,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const doc = await task.promise;
  try {
    if (doc.numPages > 15) throw Error("Use a PDF with at most 15 pages");
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      text +=
        content.items.map((x) => x.str + (x.hasEOL ? "\n" : " ")).join("") +
        "\n";
    }
    if (!text.trim())
      throw Error(
        "This PDF has no extractable text. Scanned PDFs need OCR; enter the booking manually.",
      );
    return text;
  } finally {
    await task.destroy();
  }
}
