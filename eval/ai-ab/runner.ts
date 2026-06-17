/**
 * eval/ai-ab/runner.ts — Live A/B harness for Rós (Gemini) chat.
 *
 * HOW TO RUN:
 *   GEMINI_API_KEY=<your_key> npx tsx eval/ai-ab/runner.ts
 *   # or via npm:
 *   GEMINI_API_KEY=<your_key> npm run test:ai-ab
 *
 * If GEMINI_API_KEY is absent the script exits gracefully with a clear message
 * — it NEVER fails the CI gate.
 *
 * What it does:
 *  1. Loads the dataset from dataset.ts (5 grow-context scenarios).
 *  2. For each scenario, sends the SAME context + question under two variants:
 *       A — system prompt verbatim from /api/ros (temperature 1.0, standard)
 *       B — same system, temperature 0.3 (more deterministic / precise)
 *  3. Uses the model fallback chain from /api/ros (gemini-3.5-flash first, etc.)
 *  4. For each response pair, runs an LLM judge (Gemini itself at low-T) that
 *     scores on:
 *       - Correctness (0–3): factually right grow advice
 *       - Icelandic fluency (0–3): grammatically natural Icelandic
 *       - Actionability (0–3): concrete, specific steps
 *       - Rubric compliance (0–1): contains required keywords, avoids banned ones
 *     Total: 10 points per response.
 *  5. Prints a table and declares which variant wins (or tie).
 *  6. Writes results to eval/ai-ab/results-<timestamp>.json for archiving.
 *
 * KEY DESIGN CHOICES:
 *  - Judge is the same model (Gemini) to avoid cross-provider bias.
 *  - Rubric keywords are checked programmatically first (fast, deterministic);
 *    the LLM judge handles the holistic qualitative dimensions.
 *  - We do NOT use streaming here — we want the full response for judging.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATASET, type PromptCase } from './dataset.js';

// ─── constants matching /api/ros ─────────────────────────────────────────────

const SYSTEM =
  'Rós er hlý, fróð og hagnýt ræktunarráðgjafi fyrir íslenska inniræktun (pipar & tómatar). ' +
  'Hún notar dagbókarfærslur, fasa og myndir til að ráðleggja um vökvun, næringu, klippingu/toppun, ' +
  'frjóvgun og hvenær aldin eru tilbúin. ' +
  'Þegar notandi lýsir vandamáli skaltu FYRST útskýra stuttlega hvað er líklega að gerast og af hverju, ' +
  'og GEFA SVO hagnýtar lausnir í skref-fyrir-skref lista. ' +
  'Svaraðu á íslensku, hlýlega og hnitmiðað, og kláraðu alltaf svarið. ' +
  'Notaðu einfalt Markdown (feitletrun **svona**, skáletur *svona*, tölusetta eða punktalista) ' +
  'til að gera svörin læsileg.';

const DEFAULT_CHAIN = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const ATTEMPT_TIMEOUT_MS = 12_000;

// ─── types ────────────────────────────────────────────────────────────────────

interface Variant {
  label: 'A' | 'B';
  temperature: number;
  description: string;
}

interface VariantResult {
  label: 'A' | 'B';
  model: string;
  text: string;
  latencyMs: number;
  rubricScore: number; // 0–1 programmatic
  judgeScore: number;  // 0–9 LLM judge
  totalScore: number;  // rubricScore*1 + judgeScore = 0–10
  judgeRationale: string;
}

interface CaseResult {
  caseId: string;
  description: string;
  question: string;
  variantA: VariantResult;
  variantB: VariantResult;
  winner: 'A' | 'B' | 'tie';
}

// ─── Gemini API helpers ───────────────────────────────────────────────────────

async function callGemini(
  model: string,
  apiKey: string,
  systemText: string,
  contextText: string,
  question: string,
  temperature: number,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: { parts: [{ text: systemText }] },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: contextText
              ? `Samhengi ræktunarinnar:\n${contextText}\n\n---\n\n${question}`
              : question,
          },
        ],
      },
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: 1024,
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const status = res.status;
      const errBody = await res.text().catch(() => '');
      const err = new Error(`HTTP ${status}: ${errBody.slice(0, 200)}`);
      (err as Error & { status: number }).status = status;
      throw err;
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  } finally {
    clearTimeout(timer);
  }
}

async function callWithFallback(
  apiKey: string,
  systemText: string,
  contextText: string,
  question: string,
  temperature: number,
): Promise<{ text: string; model: string }> {
  const chain = DEFAULT_CHAIN;
  let lastErr: Error | undefined;

  for (const model of chain) {
    try {
      const t0 = Date.now();
      const text = await callGemini(model, apiKey, systemText, contextText, question, temperature);
      void t0;
      return { text, model };
    } catch (err) {
      const e = err as Error & { status?: number };
      lastErr = e;
      if (e.status !== undefined && RETRYABLE.has(e.status)) {
        // Transient — try next model
        continue;
      }
      // Non-retryable (bad request etc.) — bail out
      throw e;
    }
  }

  throw lastErr ?? new Error('All models failed');
}

// ─── Programmatic rubric check ────────────────────────────────────────────────

function rubricScore(text: string, prompt: PromptCase): number {
  const lower = text.toLowerCase();
  const mustHit = prompt.rubricMustContain.every((kw) => lower.includes(kw.toLowerCase()));
  const mustAvoid = (prompt.rubricMustNotContain ?? []).every(
    (kw) => !lower.includes(kw.toLowerCase()),
  );
  return (mustHit ? 0.5 : 0) + (mustAvoid ? 0.5 : 0);
}

// ─── LLM judge ────────────────────────────────────────────────────────────────

const JUDGE_SYSTEM =
  'You are an expert evaluator for an Icelandic indoor gardening assistant called Rós. ' +
  'Your job is to score assistant responses on three dimensions (0–3 each, total 0–9). ' +
  'Always respond in JSON with keys: correctness, fluency, actionability, rationale. ' +
  'correctness: Is the grow advice factually correct for Iceland? (0=wrong, 3=excellent) ' +
  'fluency: Is the Icelandic grammatically natural and idiomatic? (0=not Icelandic/broken, 3=native-quality) ' +
  'actionability: Are there concrete, specific steps? (0=vague, 3=step-by-step clear)';

interface JudgeScore {
  correctness: number;
  fluency: number;
  actionability: number;
  rationale: string;
  total: number;
}

async function judgeResponse(
  apiKey: string,
  question: string,
  response: string,
): Promise<JudgeScore> {
  const prompt = `Question (Icelandic): ${question}\n\nAssistant response:\n${response}\n\nScore the response.`;

  const raw = await callGemini(
    DEFAULT_CHAIN[DEFAULT_CHAIN.length - 1], // use lightest model for judging
    apiKey,
    JUDGE_SYSTEM,
    '',
    prompt,
    0.1,
  );

  // Extract JSON block
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { correctness: 0, fluency: 0, actionability: 0, rationale: raw.slice(0, 200), total: 0 };
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<JudgeScore>;
    const c = Math.max(0, Math.min(3, Number(parsed.correctness ?? 0)));
    const f = Math.max(0, Math.min(3, Number(parsed.fluency ?? 0)));
    const a = Math.max(0, Math.min(3, Number(parsed.actionability ?? 0)));
    return {
      correctness: c,
      fluency: f,
      actionability: a,
      rationale: String(parsed.rationale ?? ''),
      total: c + f + a,
    };
  } catch {
    return { correctness: 0, fluency: 0, actionability: 0, rationale: 'parse error', total: 0 };
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.GEMINI_API_KEY ?? '';

  if (!apiKey) {
    console.log(
      '\n⚠️  GEMINI_API_KEY not set — skipping live A/B eval.\n' +
        'To run the A/B harness:\n' +
        '  GEMINI_API_KEY=<your_key> npm run test:ai-ab\n' +
        '  (or add GEMINI_API_KEY=... to .env and use netlify dev)\n',
    );
    process.exit(0); // graceful exit, not a failure
  }

  const VARIANTS: Variant[] = [
    { label: 'A', temperature: 1.0, description: 'Standard (temp=1.0, same as production)' },
    { label: 'B', temperature: 0.3, description: 'Precise (temp=0.3, more deterministic)' },
  ];

  const results: CaseResult[] = [];

  console.log(`\nSpíra Rós A/B Eval — ${new Date().toISOString()}`);
  console.log(`Dataset: ${DATASET.length} cases × ${VARIANTS.length} variants\n`);
  console.log('='.repeat(72));

  for (const prompt of DATASET) {
    console.log(`\nCase: ${prompt.id}`);
    console.log(`  "${prompt.description}"`);
    console.log(`  Q: ${prompt.question}`);

    const variantResults: VariantResult[] = [];

    for (const variant of VARIANTS) {
      process.stdout.write(`  Variant ${variant.label} (${variant.description})... `);
      const t0 = Date.now();

      try {
        const { text, model } = await callWithFallback(
          apiKey,
          SYSTEM,
          prompt.context,
          prompt.question,
          variant.temperature,
        );
        const latencyMs = Date.now() - t0;

        const rs = rubricScore(text, prompt);
        process.stdout.write(`${model} (${latencyMs}ms) → judging... `);

        const judge = await judgeResponse(apiKey, prompt.question, text);
        const totalScore = rs + judge.total; // 0–1 + 0–9 = 0–10

        variantResults.push({
          label: variant.label,
          model,
          text,
          latencyMs,
          rubricScore: rs,
          judgeScore: judge.total,
          totalScore,
          judgeRationale: judge.rationale,
        });

        console.log(`score=${totalScore.toFixed(1)}/10`);
      } catch (err) {
        console.error(`  FAILED: ${(err as Error).message}`);
        variantResults.push({
          label: variant.label,
          model: 'error',
          text: '',
          latencyMs: Date.now() - t0,
          rubricScore: 0,
          judgeScore: 0,
          totalScore: 0,
          judgeRationale: `Error: ${(err as Error).message}`,
        });
      }
    }

    const [vA, vB] = variantResults as [VariantResult, VariantResult];
    const diff = vA.totalScore - vB.totalScore;
    const winner: 'A' | 'B' | 'tie' = diff > 0.5 ? 'A' : diff < -0.5 ? 'B' : 'tie';

    results.push({
      caseId: prompt.id,
      description: prompt.description,
      question: prompt.question,
      variantA: vA,
      variantB: vB,
      winner,
    });

    console.log(
      `  → A=${vA.totalScore.toFixed(1)}  B=${vB.totalScore.toFixed(1)}  winner=${winner}`,
    );
  }

  // ─── Summary table ────────────────────────────────────────────────────────

  console.log('\n' + '='.repeat(72));
  console.log('SUMMARY');
  console.log('='.repeat(72));
  console.log(
    `${'Case'.padEnd(32)} ${'A'.padStart(6)} ${'B'.padStart(6)} ${'Winner'.padStart(8)}`,
  );
  console.log('-'.repeat(56));

  let aWins = 0;
  let bWins = 0;
  let ties = 0;

  for (const r of results) {
    const w = r.winner === 'A' ? '← A' : r.winner === 'B' ? 'B →' : 'tie';
    console.log(
      `${r.caseId.padEnd(32)} ${r.variantA.totalScore.toFixed(1).padStart(6)} ${r.variantB.totalScore.toFixed(1).padStart(6)} ${w.padStart(8)}`,
    );
    if (r.winner === 'A') aWins++;
    else if (r.winner === 'B') bWins++;
    else ties++;
  }

  console.log('-'.repeat(56));
  console.log(`A wins: ${aWins}  B wins: ${bWins}  Ties: ${ties}`);

  const overallWinner =
    aWins > bWins ? 'Variant A (temp=1.0)' : bWins > aWins ? 'Variant B (temp=0.3)' : 'Tie';
  console.log(`Overall winner: ${overallWinner}`);

  // ─── Write JSON results ────────────────────────────────────────────────────

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(__dirname, `results-${ts}.json`);

  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        variantA: VARIANTS[0],
        variantB: VARIANTS[1],
        cases: results,
        summary: { aWins, bWins, ties, overallWinner },
      },
      null,
      2,
    ),
    'utf-8',
  );

  console.log(`\nResults written to: ${outPath}\n`);
}

main().catch((err) => {
  console.error('Fatal error in A/B runner:', err);
  process.exit(1);
});
