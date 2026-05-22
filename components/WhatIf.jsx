"use client";

import { useEffect, useRef, useState } from "react";
import { projectNestEgg, fmtMoney } from "@/lib/insights";

// Interactive scenario panel. The user can drag sliders to see how their
// retirement picture changes. All numbers update live.
export default function WhatIf({ insights }) {
  // Sensible fallbacks if insights are partial
  const currentAge = insights?.currentAge ?? 55;
  const currentSavings = insights?.savings ?? 250000;

  const initialRetireAge = insights?.retireAge ?? 65;
  const initialMonthlyContrib = insights?.monthlyContrib ?? 1000;
  const initialMonthlySpend = insights?.monthlySpend ?? 5000;

  const minRetireAge = Math.max(currentAge + 1, 50);

  const [retireAge, setRetireAge] = useState(
    Math.max(initialRetireAge, minRetireAge)
  );
  const [monthlyContrib, setMonthlyContrib] = useState(initialMonthlyContrib);
  const [monthlySpend, setMonthlySpend] = useState(initialMonthlySpend);

  const yearsToRetirement = Math.max(0, retireAge - currentAge);
  const projectedNestEgg = projectNestEgg(
    currentSavings,
    monthlyContrib,
    yearsToRetirement
  );
  const targetNestEgg = monthlySpend * 12 * 25;
  const gap = targetNestEgg - projectedNestEgg;
  const isAhead = gap <= 0;

  function reset() {
    setRetireAge(Math.max(initialRetireAge, minRetireAge));
    setMonthlyContrib(initialMonthlyContrib);
    setMonthlySpend(initialMonthlySpend);
  }

  return (
    <section className="whatif-card">
      <div className="card-eyebrow">Try a different scenario</div>
      <h2 className="whatif-title">
        Move the sliders to see how your picture changes
      </h2>
      <p className="whatif-sub">
        Your answers are pre-filled. Adjust any of them to see the new projection.
      </p>

      <div className="whatif-grid">
        <div className="whatif-sliders">
          <SliderRow
            label="Retire at age"
            value={retireAge}
            display={String(retireAge)}
            min={minRetireAge}
            max={80}
            step={1}
            onChange={setRetireAge}
            initial={Math.max(initialRetireAge, minRetireAge)}
          />
          <SliderRow
            label="Saving each month"
            value={monthlyContrib}
            display={fmtMoney(monthlyContrib)}
            min={0}
            max={8000}
            step={50}
            onChange={setMonthlyContrib}
            initial={initialMonthlyContrib}
          />
          <SliderRow
            label="Monthly spend in retirement"
            value={monthlySpend}
            display={fmtMoney(monthlySpend)}
            min={1500}
            max={20000}
            step={100}
            onChange={setMonthlySpend}
            initial={initialMonthlySpend}
          />
        </div>

        <div className="whatif-outputs">
          <OutputRow
            label="Projected at retirement"
            value={fmtMoney(projectedNestEgg)}
            hint={`${yearsToRetirement} ${yearsToRetirement === 1 ? "year" : "years"} to grow`}
          />
          <OutputRow
            label="Target (25× annual spend)"
            value={fmtMoney(targetNestEgg)}
            hint="A common rule of thumb"
          />
          <OutputRow
            label={isAhead ? "Surplus" : "Gap"}
            value={isAhead ? `+${fmtMoney(Math.abs(gap))}` : `−${fmtMoney(gap)}`}
            tone={isAhead ? "good" : "warn"}
            big
          />
        </div>
      </div>

      <div className="whatif-presets">
        <button
          type="button"
          className="preset-btn"
          onClick={() => setMonthlyContrib((v) => Math.min(8000, v + 500))}
        >
          + $500 / month savings
        </button>
        <button
          type="button"
          className="preset-btn"
          onClick={() => setRetireAge((v) => Math.min(80, v + 3))}
        >
          Retire 3 years later
        </button>
        <button
          type="button"
          className="preset-btn"
          onClick={() => setMonthlySpend((v) => Math.max(1500, Math.round(v * 0.8 / 100) * 100))}
        >
          Cut spend by 20%
        </button>
        <button
          type="button"
          className="preset-btn preset-reset"
          onClick={reset}
        >
          Reset to my answers
        </button>
      </div>

      <p className="whatif-note">
        Rough estimates only. Assumes a ~6% blended annual return on a starting balance
        of {fmtMoney(currentSavings)} and your current age of {currentAge}. Not a guarantee
        or financial advice. Bring these numbers to the advisor call.
      </p>
    </section>
  );
}

function SliderRow({ label, value, display, min, max, step, onChange, initial }) {
  const filledPct = ((value - min) / (max - min)) * 100;
  const isChanged = value !== initial;

  return (
    <div className="slider-row">
      <div className="slider-head">
        <span className="slider-label">{label}</span>
        <span className={`slider-value ${isChanged ? "changed" : ""}`}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="slider"
        style={{ "--filled": `${filledPct}%` }}
        aria-label={label}
      />
    </div>
  );
}

function OutputRow({ label, value, hint, tone, big }) {
  // Briefly flash the value when it changes so the user sees the impact.
  const ref = useRef(null);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value && ref.current) {
      ref.current.classList.remove("flash");
      // force reflow so animation re-runs
      void ref.current.offsetWidth;
      ref.current.classList.add("flash");
    }
    prev.current = value;
  }, [value]);

  return (
    <div className={`output-row ${tone ? `tone-${tone}` : ""} ${big ? "big" : ""}`}>
      <div className="output-meta">
        <span className="output-label">{label}</span>
        {hint && <span className="output-hint">{hint}</span>}
      </div>
      <span className="output-value" ref={ref}>
        {value}
      </span>
    </div>
  );
}
