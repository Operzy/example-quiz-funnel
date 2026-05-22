// 12-step funnel: 9 retirement questions + 3 contact steps.
// Each step has an id, label, kind, and (for choice questions) options.

export const STEPS = [
  {
    id: "currentAge",
    kind: "choice",
    label: "What is your current age?",
    sub: "We use this to estimate your retirement timeline.",
    options: [
      { value: "under_50", label: "Under 50" },
      { value: "50_55", label: "50 – 55" },
      { value: "56_60", label: "56 – 60" },
      { value: "61_65", label: "61 – 65" },
      { value: "66_plus", label: "66 or older" },
    ],
  },
  {
    id: "retireAge",
    kind: "choice",
    label: "At what age do you hope to retire?",
    sub: "Not sure? Pick the closest answer.",
    options: [
      { value: "before_60", label: "Before 60" },
      { value: "60_64", label: "60 – 64" },
      { value: "65_67", label: "65 – 67" },
      { value: "68_70", label: "68 – 70" },
      { value: "after_70", label: "After 70 / Never" },
    ],
  },
  {
    id: "income",
    kind: "choice",
    label: "What is your current annual household income?",
    sub: "Before taxes, all sources combined.",
    options: [
      { value: "under_50k", label: "Under $50,000" },
      { value: "50_100k", label: "$50,000 – $100,000" },
      { value: "100_200k", label: "$100,000 – $200,000" },
      { value: "200_500k", label: "$200,000 – $500,000" },
      { value: "over_500k", label: "Over $500,000" },
    ],
  },
  {
    id: "savings",
    kind: "choice",
    label: "How much have you saved for retirement so far?",
    sub: "Include 401(k), IRA, brokerage, and similar accounts.",
    options: [
      { value: "under_100k", label: "Under $100,000" },
      { value: "100_250k", label: "$100,000 – $250,000" },
      { value: "250_500k", label: "$250,000 – $500,000" },
      { value: "500k_1m", label: "$500,000 – $1 million" },
      { value: "over_1m", label: "Over $1 million" },
    ],
  },
  {
    id: "monthlyContribution",
    kind: "choice",
    label: "How much are you saving each month for retirement?",
    sub: "Combined across all retirement accounts.",
    options: [
      { value: "under_500", label: "Less than $500" },
      { value: "500_1000", label: "$500 – $1,000" },
      { value: "1000_2500", label: "$1,000 – $2,500" },
      { value: "2500_5000", label: "$2,500 – $5,000" },
      { value: "over_5000", label: "More than $5,000" },
    ],
  },
  {
    id: "employerPlan",
    kind: "choice",
    label: "Do you have an employer-sponsored retirement plan?",
    sub: "Such as a 401(k), 403(b), or pension.",
    options: [
      { value: "401k", label: "Yes, a 401(k) or 403(b)" },
      { value: "pension", label: "Yes, a pension" },
      { value: "both", label: "Yes, both" },
      { value: "none", label: "No, I don't" },
      { value: "unsure", label: "I'm not sure" },
    ],
  },
  {
    id: "expectedSpend",
    kind: "choice",
    label: "What do you expect to spend each month in retirement?",
    sub: "An honest estimate is better than a perfect one.",
    options: [
      { value: "under_3k", label: "Less than $3,000" },
      { value: "3_5k", label: "$3,000 – $5,000" },
      { value: "5_8k", label: "$5,000 – $8,000" },
      { value: "8_12k", label: "$8,000 – $12,000" },
      { value: "over_12k", label: "More than $12,000" },
    ],
  },
  {
    id: "housing",
    kind: "choice",
    label: "What is your housing situation?",
    sub: "Housing is often the biggest retirement expense.",
    options: [
      { value: "owned_paid", label: "Own my home, paid off" },
      { value: "owned_mortgage", label: "Own my home, still paying mortgage" },
      { value: "renting", label: "Renting" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "confidence",
    kind: "choice",
    label: "How confident are you in your retirement plan today?",
    sub: "Be honest. This helps us tailor your results.",
    options: [
      { value: "very", label: "Very confident" },
      { value: "somewhat", label: "Somewhat confident" },
      { value: "not_very", label: "Not very confident" },
      { value: "not_at_all", label: "Not at all confident" },
      { value: "no_plan", label: "I don't have a plan yet" },
    ],
  },
  {
    id: "firstName",
    kind: "text",
    label: "Great. What's your first name?",
    sub: "So we can personalize your retirement report.",
    inputType: "text",
    placeholder: "First name",
    autoComplete: "given-name",
    required: true,
  },
  {
    id: "email",
    kind: "text",
    label: "Where should we send your report?",
    sub: "We'll email a copy of your personalized analysis.",
    inputType: "email",
    placeholder: "you@example.com",
    autoComplete: "email",
    required: true,
    validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "Please enter a valid email.",
  },
  {
    id: "phone",
    kind: "text",
    label: "Last step. What's the best phone number to reach you?",
    sub: "An advisor may call to walk you through your results.",
    inputType: "tel",
    placeholder: "(555) 555-5555",
    autoComplete: "tel",
    required: true,
    validate: (v) => v.replace(/\D/g, "").length >= 10 || "Please enter a valid phone number.",
  },
];

export const TOTAL_STEPS = STEPS.length;

// Per-question points + a category grouping for the breakdown view.
const POINTS = {
  currentAge: {
    under_50: 4, "50_55": 3, "56_60": 2, "61_65": 1, "66_plus": 0,
  },
  retireAge: {
    before_60: 0, "60_64": 1, "65_67": 3, "68_70": 4, after_70: 4,
  },
  income: {
    under_50k: 0, "50_100k": 1, "100_200k": 2, "200_500k": 3, over_500k: 4,
  },
  savings: {
    under_100k: 0, "100_250k": 1, "250_500k": 2, "500k_1m": 3, over_1m: 4,
  },
  monthlyContribution: {
    under_500: 0, "500_1000": 1, "1000_2500": 2, "2500_5000": 3, over_5000: 4,
  },
  employerPlan: {
    none: 0, unsure: 0, "401k": 2, pension: 3, both: 4,
  },
  expectedSpend: {
    over_12k: 0, "8_12k": 1, "5_8k": 2, "3_5k": 3, under_3k: 4,
  },
  housing: {
    renting: 0, other: 1, owned_mortgage: 2, owned_paid: 4,
  },
  confidence: {
    no_plan: 0, not_at_all: 1, not_very: 2, somewhat: 3, very: 4,
  },
};

export const READINESS_CATEGORIES = [
  {
    key: "timeline",
    label: "Timeline",
    description:
      "How much runway you have between today and the day you stop working.",
    fields: ["currentAge", "retireAge"],
  },
  {
    key: "savings",
    label: "Savings power",
    description:
      "What you've already built, what you keep adding, and the income behind it.",
    fields: ["income", "savings", "monthlyContribution"],
  },
  {
    key: "structure",
    label: "Plan foundation",
    description:
      "The structural pieces that quietly do a lot of work: employer plan and housing.",
    fields: ["employerPlan", "housing"],
  },
  {
    key: "spending",
    label: "Spending plan",
    description:
      "Your expected lifestyle in retirement and your honesty about it today.",
    fields: ["expectedSpend", "confidence"],
  },
];

export function computeReadiness(answers) {
  const breakdown = READINESS_CATEGORIES.map((cat) => {
    let s = 0;
    let m = 0;
    for (const field of cat.fields) {
      m += 4;
      const val = answers[field];
      if (val && POINTS[field]?.[val] !== undefined) s += POINTS[field][val];
    }
    return {
      key: cat.key,
      label: cat.label,
      description: cat.description,
      score: s,
      max: m,
      pct: m > 0 ? Math.round((s / m) * 100) : 0,
    };
  });

  const score = breakdown.reduce((a, b) => a + b.score, 0);
  const max = breakdown.reduce((a, b) => a + b.max, 0);
  const pct = max > 0 ? Math.round((score / max) * 100) : 0;

  let bucket;
  let bucketBlurb;
  if (pct >= 80) {
    bucket = "On Track";
    bucketBlurb = "You're in a strong position. Now it's about protecting what you've built.";
  } else if (pct >= 60) {
    bucket = "Mostly On Track";
    bucketBlurb = "You're closer than most. A few smart moves could lock this in.";
  } else if (pct >= 40) {
    bucket = "Needs Attention";
    bucketBlurb = "Good bones, but a couple of pieces need work before retirement.";
  } else if (pct >= 20) {
    bucket = "Significant Gaps";
    bucketBlurb = "There's real work to do. The earlier it starts, the easier it is.";
  } else {
    bucket = "Plan Needed";
    bucketBlurb = "You don't have a clear plan yet, and that's the most important thing to fix.";
  }

  return { score, max, pct, bucket, bucketBlurb, breakdown };
}
