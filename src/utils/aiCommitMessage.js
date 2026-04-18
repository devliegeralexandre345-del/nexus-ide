// src/utils/aiCommitMessage.js
//
// Generate a Conventional-Commits-style message from a staged git diff.
// Fast model, single round-trip, no streaming.
//
// Prompt style: subject line under 72 chars, type(scope) prefix when the
// scope is unambiguous, optional 1-3 line body explaining *why*. No emoji,
// no trailing period. Matches the repo's existing commit history.

import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

const FAST_MODELS = {
  anthropic: 'claude-3-5-haiku-20241022',
  deepseek: 'deepseek-chat',
};

// Keep the prompt bounded — git diffs on large refactors can be hundreds of KB
// which both slows the request and wastes tokens on noise. 20k chars is
// enough for a sizeable feature diff without blowing the model's context.
const DIFF_MAX_CHARS = 20000;

const SYSTEM_PROMPT = [
  'You are an expert software engineer writing a git commit message.',
  'Input: a unified diff of the STAGED changes.',
  'Output: a Conventional-Commits message and nothing else.',
  'Rules:',
  '  • First line: `type(scope): subject` — under 72 chars, imperative, no trailing period.',
  '  • type ∈ { feat, fix, perf, refactor, docs, test, chore, style, build, ci }.',
  '  • Pick the scope from the folder/module most impacted (omit scope if the change spans many areas).',
  '  • Leave a blank line, then optionally 1–3 short body lines explaining the "why" or notable trade-offs.',
  '  • Plain text. No Markdown, no code fences, no emoji.',
  '  • If the diff is empty, return exactly: `chore: empty commit`.',
].join('\n');

async function robustFetch(url, opts, preferNative) {
  const init = { ...opts };
  if (preferNative) {
    try { return await fetch(url, init); } catch (e) {
      try { return await tauriFetch(url, init); } catch (e2) {
        throw new Error(`fetch failed: ${e.message}; tauri fetch failed: ${e2.message}`);
      }
    }
  }
  try { return await tauriFetch(url, init); } catch (e) {
    try { return await fetch(url, init); } catch (e2) {
      throw new Error(`tauri fetch failed: ${e.message}; native fetch failed: ${e2.message}`);
    }
  }
}

function clipDiff(diff) {
  if (!diff) return '';
  if (diff.length <= DIFF_MAX_CHARS) return diff;
  // Prefer keeping the head of the diff (filenames + first hunks are usually
  // the most informative). Append a truncation marker so the model knows.
  return diff.slice(0, DIFF_MAX_CHARS) + `\n\n[... diff truncated, ${diff.length - DIFF_MAX_CHARS} chars omitted ...]`;
}

function cleanOutput(text) {
  if (!text) return '';
  // Strip surrounding code fences the model sometimes adds.
  let out = text.replace(/^\s*```[a-zA-Z0-9_+-]*\n?/, '').replace(/```[\s]*$/, '');
  // Trim lead/trail whitespace and double-blank-lines.
  out = out.replace(/\r\n/g, '\n').trim();
  out = out.replace(/\n{3,}/g, '\n\n');
  return out;
}

/**
 * Generate a commit message from a staged diff.
 *
 * @param {object}  args
 * @param {string}  args.diff      — output of `git diff --cached`
 * @param {string}  args.provider  — 'anthropic' | 'deepseek'
 * @param {string}  args.apiKey
 * @param {string=} args.model     — override (optional)
 * @param {AbortSignal=} args.signal
 * @returns {Promise<string>} the commit message (never throws for benign errors)
 */
export async function generateCommitMessage({
  diff, provider, apiKey, model, signal,
}) {
  if (!apiKey) throw new Error('API key missing — configure it in Settings.');
  if (!diff || !diff.trim()) return 'chore: empty commit';

  const chosenModel = model || FAST_MODELS[provider] || FAST_MODELS.anthropic;
  const userMsg = `Staged diff:\n\n${clipDiff(diff)}\n\nWrite the commit message now.`;

  if (provider === 'anthropic') {
    const body = {
      model: chosenModel,
      max_tokens: 400,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMsg }],
    };
    const r = await robustFetch(
      ANTHROPIC_ENDPOINT,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
        signal,
      },
      false, // Anthropic prefers tauri-plugin-http
    );
    if (!r.ok) {
      const errText = await safeErrorText(r);
      throw new Error(`Anthropic ${r.status}: ${errText}`);
    }
    const data = await r.json();
    const raw = (data?.content || []).map((b) => b.text || '').join('');
    return cleanOutput(raw);
  }

  // DeepSeek / OpenAI-shaped
  const body = {
    model: chosenModel,
    max_tokens: 400,
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMsg },
    ],
  };
  const r = await robustFetch(
    DEEPSEEK_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    },
    true, // DeepSeek is CORS-friendly
  );
  if (!r.ok) {
    const errText = await safeErrorText(r);
    throw new Error(`DeepSeek ${r.status}: ${errText}`);
  }
  const data = await r.json();
  const raw = data?.choices?.[0]?.message?.content || '';
  return cleanOutput(raw);
}

async function safeErrorText(response) {
  try {
    const body = await response.json();
    return body.error?.message || body.message || response.statusText;
  } catch {
    return response.statusText || 'unknown error';
  }
}
