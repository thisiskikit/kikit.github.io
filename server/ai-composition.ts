type PackHint = "small-cup" | "large-cup" | "cup" | "bag";
type TasteHint = "spicy" | "mild";

export interface AiCompositionItem {
  name: string;
  quantity: number;
  packHint: PackHint | null;
  tasteHint: TasteHint | null;
  aliases: string[];
  confidence: number | null;
}

export interface AiCompositionParseResult {
  enabled: boolean;
  used: boolean;
  model: string | null;
  items: AiCompositionItem[];
  globalHints: {
    packHint: PackHint | null;
    tasteHint: TasteHint | null;
  };
  needsClarification: boolean;
  questions: string[];
  message?: string;
}

type OpenAiResponsePayload = {
  output_text?: string | string[];
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_PRIMARY_MODEL = "gpt-5.2-pro";

const SYSTEM_PROMPT = [
  "You parse Korean package composition lines for e-commerce SKU matching.",
  "Return JSON only.",
  "",
  "Schema:",
  "{",
  '  "global_context": {',
  '    "pack": "small-cup|large-cup|cup|bag|unknown",',
  '    "taste": "spicy|mild|unknown"',
  "  },",
  '  "items": [',
  "    {",
  '      "name": "string",',
  '      "quantity": 1,',
  '      "pack": "small-cup|large-cup|cup|bag|inherit|unknown",',
  '      "taste": "spicy|mild|inherit|unknown",',
  '      "aliases": ["string"],',
  '      "confidence": 0.0',
  "    }",
  "  ],",
  '  "needs_clarification": false,',
  '  "questions": ["string"]',
  "}",
  "",
  "Rules:",
  "- Use integer quantity between 1 and 99.",
  "- Detect shared modifiers like 소컵, 대컵, 봉지, 매운맛 and apply by using item pack/taste or inherit.",
  "- Keep item names concise and searchable in Korean.",
  "- If uncertain, set needs_clarification=true and provide short Korean questions.",
].join("\n");

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const unique = (values: string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((value) => {
    const key = value.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  return out;
};

const toLower = (value: unknown) => String(value ?? "").trim().toLowerCase();

const parsePackHint = (value: unknown): PackHint | null => {
  const key = toLower(value);
  if (!key || key === "unknown" || key === "inherit") return null;

  if (
    key === "small-cup" ||
    key === "smallcup" ||
    key === "small_cup" ||
    key.includes("소컵")
  ) return "small-cup";

  if (
    key === "large-cup" ||
    key === "largecup" ||
    key === "large_cup" ||
    key.includes("대컵") ||
    key.includes("왕컵") ||
    key.includes("큰컵")
  ) return "large-cup";

  if (key === "bag" || key.includes("봉지")) return "bag";
  if (key === "cup" || key.includes("컵")) return "cup";
  return null;
};

const parseTasteHint = (value: unknown): TasteHint | null => {
  const key = toLower(value);
  if (!key || key === "unknown" || key === "inherit") return null;
  if (key === "spicy" || key.includes("매운") || key.includes("얼큰")) return "spicy";
  if (key === "mild" || key.includes("순한") || key.includes("담백")) return "mild";
  return null;
};

const parseJsonObject = (rawText: string): Record<string, any> | null => {
  const text = String(rawText || "").trim();
  if (!text) return null;

  const tryParse = (candidate: string) => {
    try {
      const parsed = JSON.parse(candidate);
      return parsed && typeof parsed === "object" ? parsed as Record<string, any> : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(text);
  if (direct) return direct;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsed = tryParse(fenced[1].trim());
    if (parsed) return parsed;
  }

  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) {
    const parsed = tryParse(text.slice(first, last + 1));
    if (parsed) return parsed;
  }

  return null;
};

const extractOutputText = (payload: OpenAiResponsePayload): string => {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }
  if (Array.isArray(payload.output_text)) {
    const joined = payload.output_text.map((part) => String(part || "").trim()).filter(Boolean).join("\n");
    if (joined) return joined;
  }
  if (Array.isArray(payload.output)) {
    const parts: string[] = [];
    payload.output.forEach((item) => {
      item.content?.forEach((content) => {
        if ((content.type === "output_text" || content.type === "text") && typeof content.text === "string") {
          parts.push(content.text);
        }
      });
    });
    const joined = parts.map((part) => part.trim()).filter(Boolean).join("\n");
    if (joined) return joined;
  }
  if (Array.isArray(payload.choices) && payload.choices[0]?.message?.content) {
    return String(payload.choices[0].message.content).trim();
  }
  return "";
};

const shouldFallbackModel = (status: number, errorText: string) => {
  if (status === 404) return true;
  if (status !== 400) return false;
  return /(model|unsupported|not found|does not exist|invalid model)/i.test(errorText);
};

const parseAiResult = (rawObject: Record<string, any>, model: string): AiCompositionParseResult => {
  const globalContext = rawObject.global_context || rawObject.globalContext || {};
  const rawItems = Array.isArray(rawObject.items) ? rawObject.items : [];
  const items: AiCompositionItem[] = rawItems
    .map((item) => {
      const name = String(item?.name ?? item?.product ?? item?.keyword ?? "").trim();
      if (!name) return null;
      const quantity = clamp(Math.floor(Number(item?.quantity ?? item?.qty ?? 1) || 1), 1, 99);
      const aliases = unique(
        (Array.isArray(item?.aliases) ? item.aliases : [])
          .map((alias: unknown) => String(alias || "").trim())
          .filter((alias: string) => alias.length >= 2 && alias !== name),
      ).slice(0, 6);
      const confidenceNum = Number(item?.confidence);
      return {
        name,
        quantity,
        packHint: parsePackHint(item?.pack ?? item?.pack_hint),
        tasteHint: parseTasteHint(item?.taste ?? item?.taste_hint),
        aliases,
        confidence: Number.isFinite(confidenceNum) ? clamp(confidenceNum, 0, 1) : null,
      } satisfies AiCompositionItem;
    })
    .filter((item): item is AiCompositionItem => Boolean(item));

  const questions = unique(
    (Array.isArray(rawObject.questions) ? rawObject.questions : [])
      .map((question) => String(question || "").trim())
      .filter((question) => question.length > 0),
  ).slice(0, 5);

  const needsClarification = Boolean(rawObject.needs_clarification ?? rawObject.needsClarification);

  return {
    enabled: true,
    used: items.length > 0,
    model,
    items,
    globalHints: {
      packHint: parsePackHint(globalContext.pack ?? globalContext.pack_hint),
      tasteHint: parseTasteHint(globalContext.taste ?? globalContext.taste_hint),
    },
    needsClarification,
    questions,
  };
};

export async function parseCompositionWithLlm(inputText: string): Promise<AiCompositionParseResult> {
  const text = String(inputText || "").trim();
  if (!text) {
    return {
      enabled: false,
      used: false,
      model: null,
      items: [],
      globalHints: { packHint: null, tasteHint: null },
      needsClarification: false,
      questions: [],
      message: "Empty input",
    };
  }

  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) {
    return {
      enabled: false,
      used: false,
      model: null,
      items: [],
      globalHints: { packHint: null, tasteHint: null },
      needsClarification: false,
      questions: [],
      message: "OPENAI_API_KEY is not configured.",
    };
  }

  const configuredModel = String(process.env.OPENAI_MODEL || "").trim() || DEFAULT_PRIMARY_MODEL;
  const modelCandidates = unique([
    configuredModel,
    DEFAULT_PRIMARY_MODEL,
    "gpt-5-pro",
    "gpt-5.2",
    "gpt-5",
  ]);

  let lastError = "";
  for (const model of modelCandidates) {
    const effort = String(process.env.OPENAI_REASONING_EFFORT || "").trim() || (model.includes("pro") ? "high" : "medium");
    const timeoutMs = clamp(Number(process.env.OPENAI_TIMEOUT_MS || 45000), 5000, 120000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(OPENAI_RESPONSES_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          reasoning: { effort },
          max_output_tokens: 1500,
          input: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                "다음 한국어 구성 문장을 파싱해줘.",
                "JSON만 반환해.",
                "",
                `문장: ${text}`,
              ].join("\n"),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 1000);
        if (shouldFallbackModel(response.status, errorText)) {
          lastError = `model=${model}, status=${response.status}`;
          continue;
        }
        throw new Error(`OpenAI API ${response.status}: ${errorText}`);
      }

      const payload = await response.json() as OpenAiResponsePayload;
      const outputText = extractOutputText(payload);
      const parsedObject = parseJsonObject(outputText);
      if (!parsedObject) {
        return {
          enabled: true,
          used: false,
          model,
          items: [],
          globalHints: { packHint: null, tasteHint: null },
          needsClarification: false,
          questions: [],
          message: "LLM returned a non-JSON response.",
        };
      }

      return parseAiResult(parsedObject, model);
    } catch (err: any) {
      lastError = err?.message || String(err);
      if (err?.name === "AbortError") {
        lastError = `OpenAI request timeout (${timeoutMs}ms)`;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    enabled: true,
    used: false,
    model: null,
    items: [],
    globalHints: { packHint: null, tasteHint: null },
    needsClarification: false,
    questions: [],
    message: lastError || "OpenAI call failed.",
  };
}
