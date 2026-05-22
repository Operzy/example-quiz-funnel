"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import WhatIf from "@/components/WhatIf";

export default function ResultsPage() {
  const router = useRouter();
  const [analysis, setAnalysis] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    let saved;
    try {
      saved = JSON.parse(sessionStorage.getItem("retirement_funnel_submission") || "null");
    } catch {
      saved = null;
    }
    if (!saved?.answers) {
      router.replace("/");
      return;
    }
    setFirstName(saved.answers.firstName || "");

    if (saved.analysis && saved.readiness) {
      setAnalysis(saved.analysis);
      setReadiness(saved.readiness);
      setInsights(saved.insights || null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: saved.answers }),
        });
        const data = await res.json();
        setAnalysis(data.analysis);
        setReadiness(data.readiness);
        setInsights(data.insights);
      } catch {
        setAnalysis({
          headline: `${saved.answers.firstName || "there"}, your report is ready.`,
          openingParagraphs: [
            "We had trouble generating your personalized commentary, but your advisor will walk you through your results on the call.",
          ],
          profileSnapshot: [],
          analysisParagraphs: [],
          callPreviewParagraphs: [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const pct = readiness?.pct ?? 0;
  const bucket = readiness?.bucket ?? "Calculating…";

  // Animate the readiness ring from 0 -> pct on load.
  useEffect(() => {
    if (loading || !readiness) return;
    const start = Date.now();
    const duration = 1200;
    const target = readiness.pct ?? 0;
    let raf;
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedPct(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setAnimatedPct(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [loading, readiness]);
  const snapshot = analysis?.profileSnapshot?.length
    ? analysis.profileSnapshot
    : buildFallbackSnapshot(insights);

  return (
    <main className="page">
      {/* Hero: personalized headline + opening letter */}
      <section className="result-hero">
        <h1>
          {loading
            ? `${firstName ? firstName + ", " : ""}your report is on its way…`
            : analysis?.headline || `${firstName || "Hello"}, here's where you stand.`}
        </h1>

        <div className="hero-prose">
          {loading ? (
            <>
              <span className="skeleton" style={{ width: "92%" }} />
              <span className="skeleton" style={{ width: "85%" }} />
              <span className="skeleton" style={{ width: "70%" }} />
            </>
          ) : (
            (analysis?.openingParagraphs || []).map((p, i) => <p key={i}>{p}</p>)
          )}
        </div>

        <div className="cta-row">
          <Link href="/book" className="btn-cta">
            📅 Book a Call With an Advisor
          </Link>
          <span className="cta-sub">Free 20-minute call · No obligation</span>
        </div>
      </section>

      {/* Compliance disclosures, placed prominently right under the hero */}
      <section className="important-disclosure" aria-label="Important Disclosure">
        <h2 className="important-disclosure-title">Important Disclosure</h2>
        <p className="important-disclosure-body">
          The content in this quiz is provided for educational and informational purposes only
          and should not be treated as personalized investment, tax, legal, or financial advice.
          The readiness score, breakdown, and projections shown are based on a limited set of
          self-reported answers and are intended only to give you a general, directional view of
          where you may stand. Any retirement projections are illustrative, assume a flat annual
          rate of return, and do not factor in inflation, taxes, fees, market volatility, or
          sequence-of-returns risk. Historical or hypothetical returns should not be relied upon
          as an indication of future performance. Nothing shown here should be used as the basis
          for a specific financial decision. The accuracy, completeness, or suitability of any
          result for your individual circumstances is not guaranteed. Before acting on any of
          this information, please consult with a licensed financial professional who can
          evaluate your full picture.
        </p>
      </section>

      <p className="test-notice inline-notice">
        This is an example quiz funnel for demonstration purposes only.{" "}
        <strong>No live traffic is currently being run to this page.</strong>
      </p>

      {/* Snapshot + readiness ring */}
      <div className="result-grid">
        <div className="result-card readiness-card">
          <div className="card-eyebrow">Where you stand</div>
          <div className="readiness-top">
            <div className="ring" style={{ "--pct": animatedPct }}>
              <div className="ring-inner">{Math.round(animatedPct)}%</div>
            </div>
            <div className="readiness-summary">
              <strong className="readiness-bucket">{bucket}</strong>
              <span className="readiness-blurb">
                {loading
                  ? "Scoring your answers…"
                  : readiness?.bucketBlurb || ""}
              </span>
            </div>
          </div>

          {!loading && readiness?.breakdown?.length > 0 && (
            <div className="readiness-bars">
              <div className="readiness-bars-label">Your readiness breakdown</div>
              {readiness.breakdown.map((cat, i) => (
                <BreakdownBar key={cat.key} cat={cat} index={i} />
              ))}
            </div>
          )}
        </div>

        <div className="result-card">
          <div className="card-eyebrow">Your numbers</div>
          {loading ? (
            <>
              <div className="skeleton" />
              <div className="skeleton" style={{ width: "80%" }} />
              <div className="skeleton" style={{ width: "70%" }} />
              <div className="skeleton" style={{ width: "85%" }} />
            </>
          ) : snapshot.length ? (
            <dl className="snapshot">
              {snapshot.map((row, i) => (
                <div key={i} className="snapshot-row">
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>We'll cover your numbers on the call.</p>
          )}
        </div>
      </div>

      {/* Interactive scenario panel */}
      {!loading && insights && <WhatIf insights={insights} />}

      {/* Main analysis: flowing prose, no headers, no lists */}
      {!loading && analysis?.analysisParagraphs?.length > 0 && (
        <section className="report-body">
          <div className="report-rule" aria-hidden="true" />
          <div className="report-prose">
            {analysis.analysisParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <section className="report-body">
          <div className="report-rule" aria-hidden="true" />
          <div className="report-prose">
            <span className="skeleton" />
            <span className="skeleton" style={{ width: "94%" }} />
            <span className="skeleton" style={{ width: "88%" }} />
            <span className="skeleton" style={{ width: "92%" }} />
            <span className="skeleton" style={{ width: "78%" }} />
            <span className="skeleton" style={{ width: "85%" }} />
          </div>
        </section>
      )}

      {/* What we'd cover on your call */}
      {!loading && analysis?.callPreviewParagraphs?.length > 0 && (
        <section className="report-body soft">
          <div className="card-eyebrow">What we'd cover on your call</div>
          <div className="report-prose">
            {analysis.callPreviewParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section className="closing-cta">
        <div className="closing-cta-inner">
          <h2>{firstName ? `${firstName}, talk it through with an advisor.` : "Talk it through with an advisor."}</h2>
          <p>
            Pick a 20-minute slot that works for you. We'll walk through these numbers together,
            answer your questions, and leave you with a clear next step. No obligation.
          </p>
          <Link href="/book" className="btn-cta">
            📅 Book Your Free Advisor Call
          </Link>
        </div>
      </section>

      <p className="helper" style={{ marginTop: 28, maxWidth: 820 }}>
        This report is for educational purposes only and is not financial, tax, or legal advice.
        Dollar figures shown are rough estimates based on the ranges you selected. For personalized
        guidance on your specific situation, speak with a licensed advisor on your free call.
      </p>
    </main>
  );
}

function BreakdownBar({ cat, index }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const delay = 350 + index * 120;
    const t = setTimeout(() => setWidth(cat.pct), delay);
    return () => clearTimeout(t);
  }, [cat.pct, index]);

  // Tone the bar based on score so weak areas read as weak.
  const tone = cat.pct >= 70 ? "good" : cat.pct >= 40 ? "ok" : "weak";

  return (
    <div className={`breakdown-row tone-${tone}`} title={cat.description}>
      <div className="breakdown-head">
        <span className="breakdown-label">{cat.label}</span>
        <span className="breakdown-pct">{cat.pct}%</span>
      </div>
      <div className="breakdown-track">
        <div
          className="breakdown-fill"
          style={{ width: `${width}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function buildFallbackSnapshot(insights) {
  if (!insights) return [];
  const fmt = insights.fmt || {};
  return [
    fmt.income && { label: "Household income", value: fmt.income + "/yr" },
    fmt.savings && { label: "Saved for retirement", value: fmt.savings },
    fmt.monthlyContrib && { label: "Saving each month", value: fmt.monthlyContrib },
    fmt.monthlySpend && { label: "Expected monthly spend", value: fmt.monthlySpend },
    insights.yearsToRetirement != null && {
      label: "Years to retirement",
      value: `~${insights.yearsToRetirement}`,
    },
    insights.savingsRatePct != null && {
      label: "Savings rate",
      value: `${insights.savingsRatePct}% of income`,
    },
  ].filter(Boolean);
}
