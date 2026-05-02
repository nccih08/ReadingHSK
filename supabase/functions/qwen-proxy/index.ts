const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const API_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
const VL_URL = "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("DASHSCOPE_API_KEY");
  if (!apiKey) {
    return json({ error: "DASHSCOPE_API_KEY is not configured" }, 500);
  }

  try {
    const body = await req.json();

    if (body.type === "ocr") {
      const text = await extractTextFromImage(apiKey, body.image);
      return json({ text });
    }

    if (body.type === "text") {
      const text = await qwenTextRequest(apiKey, body.prompt, body.maxTokens || 2000);
      return json({ text });
    }

    return json({ error: "Unknown request type" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Proxy error" }, 500);
  }
});

async function extractTextFromImage(apiKey: string, image: string) {
  if (!image) throw new Error("Missing image");

  const response = await fetch(VL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "qwen-vl-max",
      input: {
        messages: [{
          role: "user",
          content: [
            { image },
            { text: "Extract ALL Chinese text from this image exactly as written. Return ONLY the Chinese text, preserving paragraph breaks with newlines. No explanations, no translations, no extra text." },
          ],
        }],
      },
      parameters: { max_tokens: 4096 },
    }),
  });

  const data = await parseDashScopeResponse(response, "OCR error");
  const content = data.output?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content.map((c) => c.text || "").join("").trim();
  }
  return content || data.output?.text || "";
}

async function qwenTextRequest(apiKey: string, prompt: string, maxTokens: number) {
  if (!prompt) throw new Error("Missing prompt");

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "qwen-max",
      input: {
        messages: [
          { role: "system", content: "You are a JSON-only responder. Never add explanation or markdown." },
          { role: "user", content: prompt },
        ],
      },
      parameters: { max_tokens: maxTokens, result_format: "message" },
    }),
  });

  const data = await parseDashScopeResponse(response, "API error");
  return data.output?.choices?.[0]?.message?.content || data.output?.text || "";
}

async function parseDashScopeResponse(response: Response, fallbackMessage: string) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${data.message || data.code || fallbackMessage} (${response.status})`);
  }
  return data;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
