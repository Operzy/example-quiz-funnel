// Converts the user's bucket answers into concrete numerical estimates so the
// AI consultation can reference specific math, not just bucket labels.
// Estimates are intentionally illustrative (midpoints of each range) and are
// framed in copy as "rough estimates," not projections or guarantees.

const AGE_MID = {
  under_50: 47,
  "50_55": 53,
  "56_60": 58,
  "61_65": 63,
  "66_plus": 68,
};

const RETIRE_AGE_MID = {
  before_60: 58,
  "60_64": 62,
  "65_67": 66,
  "68_70": 69,
  after_70: 72,
};

const INCOME_MID = {
  under_50k: 40000,
  "50_100k": 75000,
  "100_200k": 150000,
  "200_500k": 350000,
  over_500k: 650000,
};

const SAVINGS_MID = {
  under_100k: 50000,
  "100_250k": 175000,
  "250_500k": 375000,
  "500k_1m": 750000,
  over_1m: 1500000,
};

const MONTHLY_CONTRIB_MID = {
  under_500: 250,
  "500_1000": 750,
  "1000_2500": 1750,
  "2500_5000": 3750,
  over_5000: 6500,
};

const MONTHLY_SPEND_MID = {
  under_3k: 2500,
  "3_5k": 4000,
  "5_8k": 6500,
  "8_12k": 10000,
  over_12k: 14000,
};

const HOUSING_LABEL = {
  owned_paid: "owns home, mortgage paid off",
  owned_mortgage: "owns home, still paying mortgage",
  renting: "renting",
  other: "other housing situation",
};

const PLAN_LABEL = {
  "401k": "has a 401(k) or 403(b)",
  pension: "has a pension",
  both: "has both a 401(k)/403(b) and a pension",
  none: "no employer-sponsored retirement plan",
  unsure: "unsure whether they have an employer plan",
};

const CONFIDENCE_LABEL = {
  very: "very confident in their retirement plan",
  somewhat: "somewhat confident in their retirement plan",
  not_very: "not very confident in their retirement plan",
  not_at_all: "not at all confident in their retirement plan",
  no_plan: "doesn't have a retirement plan yet",
};

function fmtMoney(n) {
  if (!Number.isFinite(n)) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? "-" : ""}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `${n < 0 ? "-" : ""}$${Math.round(abs / 1_000).toLocaleString()}K`;
  return `${n < 0 ? "-" : ""}$${Math.round(abs).toLocaleString()}`;
}

// Future value: current savings compounded + monthly contributions compounded.
// Uses 6% nominal annual return as a conservative, widely-cited long-run blend.
export function projectNestEgg(currentSavings, monthlyContrib, years, annualReturn = 0.06) {
  if (years <= 0) return currentSavings;
  const r = annualReturn;
  const fvCurrent = currentSavings * Math.pow(1 + r, years);
  const monthlyR = Math.pow(1 + r, 1 / 12) - 1;
  const months = years * 12;
  const fvContrib = monthlyContrib * ((Math.pow(1 + monthlyR, months) - 1) / monthlyR);
  return fvCurrent + fvContrib;
}

export function buildInsights(answers) {
  const currentAge = AGE_MID[answers.currentAge] ?? null;
  const retireAge = RETIRE_AGE_MID[answers.retireAge] ?? null;
  const income = INCOME_MID[answers.income] ?? null;
  const savings = SAVINGS_MID[answers.savings] ?? null;
  const monthlyContrib = MONTHLY_CONTRIB_MID[answers.monthlyContribution] ?? null;
  const monthlySpend = MONTHLY_SPEND_MID[answers.expectedSpend] ?? null;

  const yearsToRetirement =
    currentAge != null && retireAge != null ? Math.max(0, retireAge - currentAge) : null;

  const annualContrib = monthlyContrib != null ? monthlyContrib * 12 : null;
  const savingsRatePct =
    income && annualContrib != null ? +((annualContrib / income) * 100).toFixed(1) : null;

  // 25x rule of thumb: target nest egg ~= 25 × annual spend (the 4% rule inverse).
  const annualSpend = monthlySpend != null ? monthlySpend * 12 : null;
  const targetNestEgg = annualSpend != null ? annualSpend * 25 : null;

  // Rough projected nest egg at retirement (illustrative only).
  const projectedNestEgg =
    savings != null && monthlyContrib != null && yearsToRetirement != null
      ? projectNestEgg(savings, monthlyContrib, yearsToRetirement)
      : null;

  const gap =
    targetNestEgg != null && projectedNestEgg != null ? targetNestEgg - projectedNestEgg : null;

  // Flags the prompt can latch onto.
  const flags = [];
  if (yearsToRetirement != null && yearsToRetirement <= 5) flags.push("short_runway");
  if (yearsToRetirement != null && yearsToRetirement >= 15) flags.push("long_runway");
  if (savingsRatePct != null && savingsRatePct < 10) flags.push("low_savings_rate");
  if (savingsRatePct != null && savingsRatePct >= 20) flags.push("strong_savings_rate");
  if (gap != null && gap > 0 && targetNestEgg && gap / targetNestEgg > 0.5)
    flags.push("large_gap");
  if (gap != null && gap <= 0) flags.push("on_or_ahead_of_pace");
  if (answers.confidence === "no_plan" || answers.confidence === "not_at_all")
    flags.push("low_confidence");
  if (answers.housing === "renting") flags.push("renting_in_retirement_risk");
  if (answers.housing === "owned_mortgage" && yearsToRetirement != null && yearsToRetirement <= 7)
    flags.push("mortgage_into_retirement_risk");
  if (answers.employerPlan === "none") flags.push("no_employer_plan");
  if (answers.employerPlan === "unsure") flags.push("unclear_employer_plan");
  if (income != null && annualSpend != null && annualSpend > income)
    flags.push("expected_spend_exceeds_income");

  return {
    // raw numerical estimates
    currentAge,
    retireAge,
    yearsToRetirement,
    income,
    savings,
    monthlyContrib,
    annualContrib,
    monthlySpend,
    annualSpend,
    savingsRatePct,
    targetNestEgg,
    projectedNestEgg,
    gap,

    // pre-formatted strings the prompt can quote directly
    fmt: {
      income: income != null ? fmtMoney(income) : null,
      savings: savings != null ? fmtMoney(savings) : null,
      monthlyContrib: monthlyContrib != null ? fmtMoney(monthlyContrib) : null,
      annualContrib: annualContrib != null ? fmtMoney(annualContrib) : null,
      monthlySpend: monthlySpend != null ? fmtMoney(monthlySpend) : null,
      annualSpend: annualSpend != null ? fmtMoney(annualSpend) : null,
      targetNestEgg: targetNestEgg != null ? fmtMoney(targetNestEgg) : null,
      projectedNestEgg: projectedNestEgg != null ? fmtMoney(projectedNestEgg) : null,
      gap: gap != null ? fmtMoney(gap) : null,
    },

    // qualitative descriptors
    housingLabel: HOUSING_LABEL[answers.housing] || null,
    employerPlanLabel: PLAN_LABEL[answers.employerPlan] || null,
    confidenceLabel: CONFIDENCE_LABEL[answers.confidence] || null,
    flags,
  };
}

export { fmtMoney };
