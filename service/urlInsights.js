const axios = require("axios");
const URL = require("../models/url");

const CATEGORY_OPTIONS = [
  "Technology",
  "Finance",
  "Education",
  "Entertainment",
  "News",
  "Shopping",
  "Health",
  "Travel",
  "Business",
  "Other",
];

function isPublicHttpUrl(value) {
  try {
    const parsed = new globalThis.URL(value);
    const hostname = parsed.hostname.toLowerCase();

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    if (
      hostname === "localhost" ||
      hostname === "0.0.0.0" ||
      hostname === "::1" ||
      hostname.endsWith(".local") ||
      /^(10\.|127\.|169\.254\.|192\.168\.)/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    ) {
      return false;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

function decodeHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getTagContent(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match ? decodeHtml(match[1]) : "";
}

function getMetaDescription(html) {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);

  return match ? decodeHtml(match[1]) : "";
}

function extractPageContext(html, destinationUrl) {
  const title = getTagContent(html, "title");
  const description = getMetaDescription(html);
  const text = decodeHtml(html).slice(0, 6000);

  return [
    `URL: ${destinationUrl}`,
    `Title: ${title || "Unavailable"}`,
    `Description: ${description || "Unavailable"}`,
    `Page text: ${text || "Unavailable"}`,
  ].join("\n");
}

function parseModelResponse(responseText) {
  const jsonText = responseText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(jsonText);
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const category = typeof parsed.category === "string" ? parsed.category.trim() : "";

  if (!summary || !category || !CATEGORY_OPTIONS.includes(category)) {
    throw new Error("Gemini returned an invalid URL insight response");
  }

  return { summary, category };
}

async function fetchPageContext(destinationUrl) {
  if (!isPublicHttpUrl(destinationUrl)) {
    throw new Error("Destination URL is not eligible for analysis");
  }

  let response;
  try {
    response = await axios.get(destinationUrl, {
      timeout: 8000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      responseType: "stream",
      validateStatus: (status) => status >= 200 && status < 300,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Zipply-URL-Insights/1.0)",
      },
    });
  } catch (error) {
    if ([401, 403].includes(error.response?.status)) {
      return `URL: ${destinationUrl}\nTitle: Unavailable\nDescription: The destination blocked automated content access.\nPage text: Unavailable`;
    }

    throw error;
  }

  const contentType = String(response.headers["content-type"] || "").toLowerCase();
  if (!contentType.includes("text/html")) {
    throw new Error("Destination is not an HTML page");
  }

  const chunks = [];
  let contentLength = 0;
  for await (const chunk of response.data) {
    const remainingLength = 200000 - contentLength;
    if (remainingLength <= 0) {
      response.data.destroy();
      break;
    }

    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    const limitedChunk = buffer.subarray(0, remainingLength);
    chunks.push(limitedChunk);
    contentLength += limitedChunk.length;

    if (limitedChunk.length < buffer.length) {
      response.data.destroy();
      break;
    }
  }

  return extractPageContext(Buffer.concat(chunks).toString("utf8"), destinationUrl);
}

async function generateInsights(pageContext) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const payload = {
    contents: [
      {
        parts: [
          {
            text: [
              "Analyze this webpage for a URL shortener.",
              `Return only valid JSON with exactly two string fields: summary and category.`,
              `The summary must be exactly two concise sentences. category must be one of: ${CATEGORY_OPTIONS.join(", ")}.`,
              pageContext,
            ].join("\n\n"),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  let response;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await axios.post(endpoint, payload, {
        params: { key: apiKey },
        timeout: 15000,
      });
      break;
    } catch (error) {
      const status = error.response?.status;
      const isTransient = [429, 500, 502, 503, 504].includes(status);
      if (!isTransient || attempt === 2) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error("Gemini returned an empty response");
  }

  return parseModelResponse(responseText);
}

async function analyzeUrlInsights({ urlId, destinationUrl }) {
  try {
    await URL.updateOne(
      { _id: urlId },
      {
        $set: { "aiInsights.status": "processing", "aiInsights.error": "" },
        $inc: { "aiInsights.attempts": 1 },
      }
    );
    const pageContext = await fetchPageContext(destinationUrl);
    const insights = await generateInsights(pageContext);

    await URL.updateOne(
      { _id: urlId },
      {
        $set: {
          "aiInsights.status": "completed",
          "aiInsights.summary": insights.summary,
          "aiInsights.category": insights.category,
          "aiInsights.analyzedAt": new Date(),
          "aiInsights.error": "",
        },
      }
    );
  } catch (error) {
    console.error(`URL insights failed for ${urlId}:`, error.message || error);
    await URL.updateOne(
      { _id: urlId },
      {
        $set: {
          "aiInsights.status": "failed",
          "aiInsights.error": error.message || "Analysis failed",
        },
      }
    );
  }
}

module.exports = {
  analyzeUrlInsights,
};
