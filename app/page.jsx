"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STEPS, TOTAL_STEPS } from "@/lib/questions";

const STORAGE_KEY = "retirement_funnel_v1";

const ANALYZE_MESSAGES = [
  { from: 0, text: "Reviewing your answers" },
  { from: 30, text: "Analyzing your numbers" },
  { from: 65, text: "Preparing your report" },
];

export default function QuizPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [textValue, setTextValue] = useState("");
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef(null);

  const step = STEPS[stepIndex];
  const progressPct = Math.round(((stepIndex) / TOTAL_STEPS) * 100);

  // Restore in-progress quiz from localStorage so users don't lose answers on refresh.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === "object") {
          if (saved.answers) setAnswers(saved.answers);
          if (typeof saved.stepIndex === "number" && saved.stepIndex < TOTAL_STEPS) {
            setStepIndex(saved.stepIndex);
          }
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ stepIndex, answers }));
    } catch {}
  }, [stepIndex, answers]);

  useEffect(() => {
    setError("");
    if (step?.kind === "text") {
      setTextValue(answers[step.id] || "");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drive the analyzing progress bar:
  //   - Linear 0 -> 85% over the first 2.5s so the user sees real movement.
  //   - Then asymptotic toward ~95% while we wait for the API.
  useEffect(() => {
    if (!analyzing) return;
    const start = Date.now();
    let raf;
    const tick = () => {
      const elapsed = Date.now() - start;
      let target;
      if (elapsed < 2500) {
        target = (elapsed / 2500) * 85;
      } else {
        target = 85 + 10 * (1 - Math.exp(-(elapsed - 2500) / 4000));
      }
      setProgress((p) => (target > p ? target : p));
      if (target < 94.6) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyzing]);

  function goNext(updated) {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= TOTAL_STEPS) {
      void finishQuiz(updated);
    } else {
      setStepIndex(nextIndex);
    }
  }

  function goBack() {
    if (stepIndex === 0) return;
    setStepIndex(stepIndex - 1);
  }

  function handleChoice(option) {
    if (analyzing) return;
    const updated = { ...answers, [step.id]: option.value };
    setAnswers(updated);
    setTimeout(() => goNext(updated), 220);
  }

  function handleTextSubmit(e) {
    e?.preventDefault();
    const value = textValue.trim();
    if (step.required && !value) {
      setError("Please fill this in to continue.");
      return;
    }
    if (typeof step.validate === "function") {
      const v = step.validate(value);
      if (v !== true) {
        setError(typeof v === "string" ? v : "Please check your entry.");
        return;
      }
    }
    const updated = { ...answers, [step.id]: value };
    setAnswers(updated);
    goNext(updated);
  }

  async function finishQuiz(finalAnswers) {
    setAnalyzing(true);
    setProgress(0);
    const startedAt = Date.now();
    const MIN_LOADING_MS = 2500;

    // Fire submit (webhook) and analyze (Claude) in parallel.
    const [submitRes, analyzeRes] = await Promise.allSettled([
      fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      }),
      fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      }),
    ]);

    const payload = {
      answers: finalAnswers,
      submissionId: null,
      analysis: null,
      readiness: null,
      insights: null,
    };

    if (submitRes.status === "fulfilled") {
      try {
        const data = await submitRes.value.json();
        payload.submissionId = data?.submissionId || null;
      } catch {}
    }

    if (analyzeRes.status === "fulfilled") {
      try {
        const data = await analyzeRes.value.json();
        payload.analysis = data?.analysis || null;
        payload.readiness = data?.readiness || null;
        payload.insights = data?.insights || null;
      } catch {}
    }

    // Enforce a minimum visible loading time so fast responses don't blink past.
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
    }

    // Snap to 100% and let it settle visually before transitioning.
    setProgress(100);
    await new Promise((r) => setTimeout(r, 650));

    try {
      sessionStorage.setItem("retirement_funnel_submission", JSON.stringify(payload));
    } catch {}
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    router.push("/results");
  }

  const currentSelection = answers[step?.id];
  const statusMsg =
    ANALYZE_MESSAGES.slice().reverse().find((m) => progress >= m.from)?.text ||
    ANALYZE_MESSAGES[0].text;
  const firstName = (answers.firstName || "").trim();

  // ---------- Analyzing view ----------
  if (analyzing) {
    return (
      <main className="page">
        <section className="card analyze-card" aria-live="polite">
          <div className="analyze-eyebrow">One moment</div>
          <h1 className="analyze-headline">
            {firstName
              ? `${firstName}, we're putting your results together.`
              : "We're putting your results together."}
          </h1>

          <div className="analyze-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <div className="analyze-bar-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="analyze-status">
            <span key={statusMsg} className="analyze-status-text">{statusMsg}…</span>
          </div>

          <p className="analyze-helper">This usually takes about 10 seconds.</p>
        </section>
      </main>
    );
  }

  // ---------- Quiz view ----------
  return (
    <main className="page">
      <header className="quiz-header">
        <h1 className="quiz-headline">How close are you to retirement?</h1>
        <p className="quiz-subhead">Answer 12 quick questions to find out. Takes about 2 minutes.</p>
      </header>

      <div className="progress" aria-hidden={false}>
        <div className="progress-label">
          <span>Question {Math.min(stepIndex + 1, TOTAL_STEPS)} of {TOTAL_STEPS}</span>
          <span>{progressPct}% complete</span>
        </div>
        <div className="progress-track" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <section className="card" key={step.id}>
        <div className="step-eyebrow">Step {stepIndex + 1}</div>
        <h1 className="step-title">{step.label}</h1>
        {step.sub && <p className="step-sub">{step.sub}</p>}

        {step.kind === "choice" && (
          <div className="options" role="radiogroup" aria-label={step.label}>
            {step.options.map((opt) => {
              const selected = currentSelection === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={`option ${selected ? "selected" : ""}`}
                  onClick={() => handleChoice(opt)}
                >
                  <span className="check" aria-hidden="true" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {step.kind === "text" && (
          <form onSubmit={handleTextSubmit} noValidate>
            <input
              ref={inputRef}
              className="text-field"
              type={step.inputType || "text"}
              placeholder={step.placeholder}
              autoComplete={step.autoComplete}
              value={textValue}
              onChange={(e) => {
                setTextValue(e.target.value);
                if (error) setError("");
              }}
              inputMode={step.inputType === "tel" ? "tel" : step.inputType === "email" ? "email" : "text"}
            />
            {error && <div className="error" role="alert">{error}</div>}

            <div className="nav">
              <button type="button" className="btn btn-ghost" onClick={goBack} disabled={stepIndex === 0}>
                ← Back
              </button>
              <button type="submit" className="btn btn-primary">
                {stepIndex === TOTAL_STEPS - 1 ? "Get My Free Retirement Report" : "Continue"}
              </button>
            </div>
          </form>
        )}

        {step.kind === "choice" && stepIndex > 0 && (
          <div className="nav">
            <button type="button" className="btn btn-ghost" onClick={goBack}>
              ← Back
            </button>
            <span />
          </div>
        )}
      </section>

    </main>
  );
}
