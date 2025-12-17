import OpenAI from "openai";

const ORIGIN = "https://amanpeace52-wq.github.io";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  // ✅ Create client AFTER we know it's a POST
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { mode, dump, energy = "medium" } = req.body || {};

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

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: dump }
      ],
      response_format: { type: "json_schema", json_schema: schema }
    });

    return res.status(200).json(JSON.parse(response.output_text));
  } catch (e) {
    return res.status(500).send("AI error — check OPENAI_API_KEY + Vercel logs.");
  }
}
