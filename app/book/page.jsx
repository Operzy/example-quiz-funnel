"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const FALLBACK_CALENDLY = "https://calendly.com/REPLACE-ME/retirement-review";

export default function BookPage() {
  const [calendlyUrl, setCalendlyUrl] = useState(
    process.env.NEXT_PUBLIC_CALENDLY_URL || FALLBACK_CALENDLY
  );
  const [prefill, setPrefill] = useState({ name: "", email: "" });

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("retirement_funnel_submission") || "null");
      if (saved?.answers) {
        setPrefill({
          name: saved.answers.firstName || "",
          email: saved.answers.email || "",
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Load Calendly's embed script once on the client.
    const id = "calendly-widget-script";
    if (document.getElementById(id)) return;
    const s = document.createElement("script");
    s.id = id;
    s.src = "https://assets.calendly.com/assets/external/widget.js";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  const params = new URLSearchParams();
  if (prefill.name) params.set("name", prefill.name);
  if (prefill.email) params.set("email", prefill.email);
  const dataUrl = `${calendlyUrl}${params.toString() ? `?${params.toString()}` : ""}`;

  const isPlaceholder = calendlyUrl.includes("REPLACE-ME");

  return (
    <main className="page">
      <div className="brand">
        <span className="brand-dot" />
        Pick a Time That Works
      </div>

      <section className="result-hero" style={{ marginBottom: 20 }}>
        <div className="score-tag">Final step</div>
        <h1>{prefill.name ? `${prefill.name}, grab a time below` : "Grab a time below"}</h1>
        <p className="lede">
          Your advisor will review your quiz results with you and answer any questions.
          No obligation, and the call is free.
        </p>
      </section>

      <div className="calendly-wrap">
        {isPlaceholder ? (
          <div style={{ padding: "40px 28px", textAlign: "center" }}>
            <h2 style={{ color: "var(--navy-900)", marginTop: 0 }}>
              Calendly link not configured yet
            </h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 17, maxWidth: 520, margin: "0 auto 18px" }}>
              Set <code>NEXT_PUBLIC_CALENDLY_URL</code> in your <code>.env.local</code> to your
              real Calendly link (for example <code>https://calendly.com/your-handle/30min</code>),
              then restart the dev server.
            </p>
            <p style={{ color: "var(--ink-muted)", fontSize: 14 }}>
              Until then, the embed below is hidden because the URL is a placeholder.
            </p>
          </div>
        ) : (
          <div
            className="calendly-inline-widget"
            data-url={dataUrl}
            style={{ minWidth: 320, height: 720 }}
          />
        )}
      </div>

      <p className="helper" style={{ marginTop: 22 }}>
        Trouble seeing the calendar?{" "}
        <a className="muted-link" href={dataUrl} target="_blank" rel="noreferrer">
          Open Calendly in a new tab →
        </a>
        <br />
        <Link href="/results" className="muted-link" style={{ marginTop: 8, display: "inline-block" }}>
          ← Back to your report
        </Link>
      </p>
    </main>
  );
}
