import React, { useState } from "react";
import { api } from "./api";
export default function Ingest({ tripId, edit }) {
  const [error, setError] = useState(""),
    [result, setResult] = useState(null),
    [busy, setBusy] = useState(false);
  return (
    <>
      <span className="eyebrow">BRING YOUR BOOKINGS TOGETHER</span>
      <h2>Import a confirmation.</h2>
      <p>
        Paste structured booking text, or upload a text PDF, .txt, .eml or UTC
        .ics calendar file. Review extracted fields before saving.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const f = e.currentTarget;
          try {
            const file = f.elements.namedItem("document").files[0];
            let input = { text: f.elements.namedItem("confirmation").value };
            if (file) {
              if (file.size > 2000000)
                throw Error("File must be smaller than 2 MB");
              if (file.name.toLowerCase().endsWith(".pdf")) {
                const bytes = new Uint8Array(await file.arrayBuffer());
                let binary = "";
                for (const byte of bytes) binary += String.fromCharCode(byte);
                input = { pdf: btoa(binary) };
              } else input = { text: await file.text() };
            }
            setResult(await api(`trips/${tripId}/parse`, input));
          } catch (err) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Confirmation text
          <textarea
            name="confirmation"
            rows={10}
            placeholder={
              "Title: Delhi to Jaipur\nType: flight\nProvider: IndiGo\nReference: ABC123\nStart: 2026-10-12T08:00:00+05:30\nEnd: 2026-10-12T09:00:00+05:30\nFrom: DEL\nTo: JAI\nPrice: 4200\nRefund: 75%\nRefund deadline: 2026-10-11T00:00:00+05:30"
            }
          />
        </label>
        <label>
          Or upload a file
          <input name="document" type="file" accept=".pdf,.txt,.eml,.ics" />
        </label>
        <button
          className="button primary"
          style={{ marginTop: 20 }}
          disabled={busy}
        >
          {busy ? "Reading document…" : "Extract booking details"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {result && (
        <div className="ingest-preview">
          <p className="notice">{result.note}</p>
          {result.drafts.map((b, i) => (
            <div className="inventory-row" key={i}>
              <div>
                <b>{b.title || "Untitled booking"}</b>
                <p>
                  {b.type} · {b.start || "Start time needs review"}
                </p>
              </div>
              <button className="button" onClick={() => edit(b)}>
                Review & add
              </button>
            </div>
          ))}
          <details>
            <summary>Extracted source text</summary>
            <pre>{result.extractedText}</pre>
          </details>
        </div>
      )}
    </>
  );
}
