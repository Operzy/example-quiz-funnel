import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { STEPS, computeReadiness } from "@/lib/questions";
import { buildInsights } from "@/lib/insights";

export const runtime = "nodejs";
export const maxDuration = 60;

function humanize(answers) {
  const out = {};
  for (const step of STEPS) {
    const raw = answers[step.id];
    if (!raw) continue;
    if (step.kind === "choice") {
      const match = step.options.find((o) => o.value === raw);
      out[step.label] = match ? match.label : raw;
    } else if (step.id !== "email" && step.id !== "phone") {
      out[step.label] = raw;
    }
  }
  return out;
}

function fallbackAnalysis(answers, readiness, insights) {
  const name = answers.firstName || "there";
  const fmt = insights.fmt;
  const years = insights.yearsToRetirement;

  const opening = [];
  if (insights.currentAge && insights.retireAge) {
    opening.push(
      `${name}, based on what you shared, you're roughly ${insights.currentAge} and hoping to retire around ${insights.retireAge}, about ${years} years from now. That's the window we're working with, and it shapes almost every other decision in front of you.`
    );
  }
  if (fmt.savings && fmt.monthlyContrib && fmt.monthlySpend) {
    opening.push(
      `Right now you have about ${fmt.savings} put away for retirement, you're adding roughly ${fmt.monthlyContrib} every month, and you expect to spend around ${fmt.monthlySpend} a month once you're done working. The advisor call is where those three numbers get pulled apart and stress-tested together.`
    );
  }

  return {
    headline: `${name}, here's where you stand.`,
    openingParagraphs:
      opening.length > 0
        ? opening
        : [
            `${name}, your retirement readiness report is ready below.`,
            `Your advisor will walk through the specifics with you on your call. Together we'll look at where you stand, what's quietly working in the background, and where the real opportunities are.`,
          ],
    profileSnapshot: [
      fmt.income && { label: "Household income", value: fmt.income + "/yr" },
      fmt.savings && { label: "Saved so far", value: fmt.savings },
      fmt.monthlyContrib && { label: "Saving each month", value: fmt.monthlyContrib },
      fmt.monthlySpend && { label: "Expected monthly spend", value: fmt.monthlySpend },
      years != null && { label: "Years to retirement", value: `~${years}` },
      insights.savingsRatePct != null && {
        label: "Savings rate",
        value: `${insights.savingsRatePct}% of income`,
      },
    ].filter(Boolean),
    analysisParagraphs: [
      `Your advisor will walk through the specifics of your situation on the call. The numbers above are illustrative estimates based on the ranges you selected.`,
    ],
    callPreviewParagraphs: [
      `On the call, the advisor will reflect your answers back to you, identify the one or two changes that move the needle most in your case, and give you a clear next step.`,
    ],
  };
}

const SYSTEM_PROMPT = `You are a warm, plain-spoken retirement-planning analyst writing a personalized readiness report for one US reader, age 50+.

PRIMARY GOAL
The reader should finish reading and think "they actually understood my situation." Make it feel like an analyst sat down and thought carefully about THEIR specific numbers, not like a template was filled in.

VOICE
- Write like a thoughtful human, not a chatbot. Warm, plain-spoken, direct. Like a friend who happens to be a planner.
- Address the reader by FIRST NAME at least 3 times across the report, naturally placed.
- Use "you" and "your" frequently. Speak TO them, not about them.
- Vary sentence length. Mix short punchy sentences with longer ones. Avoid parallel sentence structures repeated in a row.
- No hype words ("amazing", "incredible", "powerful"). No emojis. No exclamation marks.
- Avoid AI-tells: never write "It's important to note that...", "Based on the information provided...", "In conclusion...", "Here are three key things...". Skip throat-clearing.

SUBSTANCE
- Reflect their ACTUAL numbers back at them whenever you have them: household income, current savings, monthly contribution, expected spend, projected nest egg, target nest egg, gap.
- Reference at least FIVE of their specific answers across the report. Mix quantitative (dollar figures, ages) with qualitative (housing, employer plan, confidence).
- Name the SPECIFIC tension in their situation: the one or two things about their particular mix of answers that someone scanning this for the first time would want a planner to address.
- Every sentence should be one that wouldn't apply if a different reader had given different answers. No generic retirement truisms.

FORMAT RULES (these are what kills the "AI feel," follow them strictly)
- Write in flowing PARAGRAPHS. Do NOT use bullet points, numbered lists, or "first/second/third" enumerations anywhere in the body fields.
- Do NOT include section headers, labels, or titles inside the prose. The UI provides those.
- Do NOT write phrases like "Here are three things to focus on" or "Let me walk you through". Just SAY the things.
- Weave concerns and opportunities into the narrative; don't separate them into a "risks list" and a "wins list."
- NEVER use em dashes (—). They are a strong AI tell. Use commas, periods, semicolons, parentheses, or colons instead. This rule applies to every string field in the output.

COMPLIANCE LIMITS (HARD)
- The numbers you receive are ROUGH ESTIMATES from midpoints of ranges. Frame them that way: "rough estimate," "ballpark," "in the neighborhood of." Never present them as guarantees or precise projections.
- Never recommend a specific product, fund, ticker, insurance type, or company.
- Never quote return rates, performance promises, or precise future values you weren't given.
- Never give specific tax, legal, or investment advice. You're setting up a conversation with a licensed advisor.
- General educational mentions are fine (the 25x / 4% rule of thumb, Social Security claiming windows, RMDs, the Medicare-at-65 bridge) framed as widely-known concepts.

OUTPUT
- Respond with ONLY a single valid JSON object. No prose before or after. No markdown code fences.
- Schema:
{
  "headline": string,                          // under 90 chars, includes first name, captures their specific situation in one line
  "openingParagraphs": string[],               // exactly 2 paragraphs. Each ~60-100 words. The reader's situation in plain English, weaving in their numbers and naming the tension. Reads like the opening of a letter from an analyst.
  "profileSnapshot": [                         // 4-6 items reflecting their key inputs back as data
    { "label": string, "value": string }
  ],
  "analysisParagraphs": string[],              // 3 paragraphs of flowing prose, ~80-130 words each. Paragraph 1: what's working in their plan and why, specifically. Paragraph 2: where the tensions are and what's quietly working against them. Paragraph 3: what the next 12-24 months look like if they put this on track. All written as continuous prose. NO lists, NO sub-headers, NO em dashes.
  "callPreviewParagraphs": string[]            // exactly 2 paragraphs, ~50-90 words each. What the reader can expect on the free advisor call, framed around the specific topics that matter for THEIR situation.
}`;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const answers = body?.answers || {};
  const readiness = computeReadiness(answers);
  const insights = buildInsights(answers);
  const firstName = (answers.firstName || "").trim() || "there";
  const profile = humanize(answers);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      ok: true,
      ai: false,
      readiness,
      insights,
      analysis: fallbackAnalysis(answers, readiness, insights),
    });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userPrompt = `Reader's quiz response.

FIRST NAME: ${firstName}

THEIR ANSWERS (verbatim labels and selections):
${Object.entries(profile).map(([q, a]) => `- ${q} → ${a}`).join("\n")}

ROUGH NUMERICAL ESTIMATES (midpoints of their selected ranges, treat as illustrative only):
- Estimated current age: ${insights.currentAge ?? "n/a"}
- Estimated retirement age: ${insights.retireAge ?? "n/a"}
- Years to retirement: ~${insights.yearsToRetirement ?? "n/a"}
- Household income: ${insights.fmt.income ?? "n/a"}/yr
- Retirement savings today: ${insights.fmt.savings ?? "n/a"}
- Saving each month: ${insights.fmt.monthlyContrib ?? "n/a"} (≈ ${insights.fmt.annualContrib ?? "n/a"}/yr)
- Current savings rate: ${insights.savingsRatePct != null ? insights.savingsRatePct + "% of income" : "n/a"}
- Expected monthly spend in retirement: ${insights.fmt.monthlySpend ?? "n/a"} (≈ ${insights.fmt.annualSpend ?? "n/a"}/yr)
- Target nest egg (25x rule of thumb): ${insights.fmt.targetNestEgg ?? "n/a"}
- Rough projected nest egg at retirement (assumes ~6% blended return, current savings + ongoing contributions, no inflation adjustment): ${insights.fmt.projectedNestEgg ?? "n/a"}
- Rough projected gap vs. target: ${insights.fmt.gap ?? "n/a"}  ${insights.gap != null && insights.gap > 0 ? "(short)" : insights.gap != null ? "(surplus)" : ""}
- Housing: ${insights.housingLabel ?? "n/a"}
- Employer plan: ${insights.employerPlanLabel ?? "n/a"}
- Confidence: ${insights.confidenceLabel ?? "n/a"}
- Readiness bucket from internal scoring: ${readiness.bucket} (${readiness.pct}%)
- Internal flags: ${insights.flags.join(", ") || "none"}

Write the JSON now. Remember the format rules: flowing prose only, no lists, no numbered structure, no internal section headers. Use ${firstName}'s name at least 3 times. Reflect their actual dollar figures back. Name the specific tension in THEIR situation.`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2400,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = (msg.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in model output");
    const parsed = JSON.parse(jsonMatch[0]);

    // Defensive: replace any em dashes the model slipped in with commas.
    const stripDashes = (s) =>
      typeof s === "string" ? s.replace(/\s*—\s*/g, ", ") : s;
    const toStringArray = (arr) =>
      Array.isArray(arr)
        ? arr.map((v) => stripDashes(String(v))).filter((s) => s.trim().length > 0)
        : [];

    const analysis = {
      headline: stripDashes(
        String(parsed.headline || `${firstName}, here's where you stand.`)
      ),
      openingParagraphs: toStringArray(parsed.openingParagraphs),
      profileSnapshot: Array.isArray(parsed.profileSnapshot)
        ? parsed.profileSnapshot
            .filter((p) => p && typeof p === "object")
            .map((p) => ({
              label: stripDashes(String(p.label || "")),
              value: stripDashes(String(p.value || "")),
            }))
        : [],
      analysisParagraphs: toStringArray(parsed.analysisParagraphs),
      callPreviewParagraphs: toStringArray(parsed.callPreviewParagraphs),
    };

    return NextResponse.json({ ok: true, ai: true, readiness, insights, analysis });
  } catch (err) {
    console.error("Claude analyze error:", err?.message || err);
    return NextResponse.json({
      ok: true,
      ai: false,
      readiness,
      insights,
      analysis: fallbackAnalysis(answers, readiness, insights),
      error: "ai_failed",
    });
  }
}
