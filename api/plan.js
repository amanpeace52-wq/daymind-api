import OpenAI from "openai";

const ORIGIN = "https://amanpeace52-wq.github.io";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).send("Missing OPENAI_API_KEY on server");

    const client = new OpenAI({ apiKey });

    // Vercel sometimes gives body as string depending on setup
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const { mode, dump, energy = "medium" } = body;

    if (!dump || dump.trim().length < 5) {
      return res.status(400).send("Missing 'dump' text");
    }

    const systemPrompt = `
You are DayMind AI.
Turn messy thoughts into a calm, realistic daily plan.

Rules:
- Choose ONE anchor task.
- Separate action vs noise.
- Reduce overload.
- Be kind and human.

Modes:
SECOND_BRAIN → clarity + guilt-free deferral
AI_RUN_MY_DAY → bold, cancel or move things
MOOD_AWARE → adapt plan + tone to energy (${energy})
`;

    const schema = {
      name: "daymind_plan",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          anchor_task: { type: "string" },
          must_do: { type: "array", items: { type: "string" } },
          should_do: { type: "array", items: { type: "string" } },
          can_wait: { type: "array", items: { type: "string" } },
          noise: { type: "array", items: { type: "string" } },
          schedule_blocks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                minutes: { type: "number" },
                tasks: { type: "array", items: { type: "string" } }
              },
              required: ["label", "minutes", "tasks"]
            }
          },
          cancellations: { type: "array", items: { type: "string" } },
          moves: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                task: { type: "string" },
                from: { type: "string" },
                to: { type: "string" },
                why: { type: "string" }
              },
              required: ["task", "from", "to", "why"]
            }
          },
          tone_note: { type: "string" },
          assumptions: { type: "array", items: { type: "string" } }
        },
        required: [
          "anchor_task","must_do","should_do","can_wait","noise",
          "schedule_blocks","cancellations","moves","tone_note","assumptions"
        ]
      }
    };

    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Mode: ${mode}\n\nDump:\n${dump}` }
      ],
      response_format: { type: "json_schema", json_schema: schema }
    });

    return res.status(200).json(JSON.parse(response.output_text));
  } catch (e) {
    console.error("PLAN API ERROR:", e);
    const msg = e?.message || "Unknown error";
    return res.status(500).send(msg);
  }
}
