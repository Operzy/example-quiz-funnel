import { NextResponse } from "next/server";
import { STEPS, computeReadiness } from "@/lib/questions";

export const runtime = "nodejs";

// Map machine values to the human label so GHL receives readable data.
function humanize(answers) {
  const out = {};
  for (const step of STEPS) {
    const raw = answers[step.id];
    if (!raw) continue;
    if (step.kind === "choice") {
      const match = step.options.find((o) => o.value === raw);
      out[step.id] = match ? match.label : raw;
    } else {
      out[step.id] = raw;
    }
  }
  return out;
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const answers = body?.answers || {};
  const readiness = computeReadiness(answers);
  const human = humanize(answers);

  const payload = {
    source: "Retirement Readiness Quiz",
    submittedAt: new Date().toISOString(),
    firstName: answers.firstName || "",
    email: answers.email || "",
    phone: answers.phone || "",
    readiness,
    answers: human,
    rawAnswers: answers,
  };

  const webhook = process.env.GHL_WEBHOOK_URL;
  let webhookOk = false;
  let webhookStatus = null;

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      webhookOk = res.ok;
      webhookStatus = res.status;
    } catch (err) {
      // Don't fail the user flow if the webhook is unreachable; just log server-side.
      console.error("GHL webhook error:", err?.message || err);
    }
  } else {
    console.warn("GHL_WEBHOOK_URL not set, skipping lead push. Payload:", payload);
  }

  return NextResponse.json({
    ok: true,
    webhookOk,
    webhookStatus,
    readiness,
  });
}
