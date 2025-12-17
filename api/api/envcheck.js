export default function handler(req, res) {
  const key = process.env.OPENAI_API_KEY || "";
  res.status(200).json({
    hasKey: key.length > 0,
    length: key.length,
    startsWithSk: key.startsWith("sk-"),
    env: process.env.VERCEL_ENV || "unknown"
  });
}
