import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const allowedOrigin = "https://amanpeace52-wq.github.io"; // your GH Pages origin

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(200).setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.end();
  }

  if (req.method !== "POST") {
    return res.status(405).setHeader("Access-Control-Allow-Origin", allowedOrigin).send("Method not allowed");
  }

  const { mode, dump, energy = "medium" } = req.body || {};

  const system = `You are DayMind AI. Turn messy thoughts into a calm, realistic day plan.
Mode: ${mode}

Rules:
- Always pick ONE anchor task.
- Separate actionable items vs noise.
- Be realistic: if overloaded, reduce scope.
- Keep language human and supportive.
- Include assumptions when info is missing.

Mode rules:
SECOND_BRAIN: clarity + guilt-free deferral.
AI_RUN_MY_DAY: bold; propose cancellations/moves; protect at least one focus block.
MOOD_AWARE: adapt plan + tone to energy (low/medium/high).`;

  // Use structured JSON output so the UI is consistent. :contentReference[oaicite:3]{index=3}
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
            required: ["label","minutes","tasks"]
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
            required: ["task","from","to","why"]
          }
        },
        tone_note: { type: "string" },
        assumptions: { type: "array", items: { type: "string" } }
      },
      required: ["anchor_task","must_do","should_do","can_wait","noise","schedule_blocks","cancellations","moves","tone_note","assumptions"]
    }
  };

  try {
    const response = await client.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: system },
        { role: "user", content: `User dump:\n${dump}\n\nEnergy: ${energy}` }
      ],
      response_format: { type: "json_schema", json_schema: schema }
    });

    const jsonText = response.output_text;

    res.setHeader("Content-Type", "application/json");
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).send(jsonText);
  } catch (e) {
    Object.entries(corsHeaders()).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).send("Server error (check API key + logs).");
  }
}
