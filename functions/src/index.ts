import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

export const processBillWithGemini = onRequest(
  { cors: true },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { base64Image } = req.body;

      if (!base64Image) {
        res.status(400).send("Missing base64Image in request body.");
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

      if (!apiKey) {
        logger.error("GEMINI_API_KEY is not set.");
        res.status(500).send("Gemini API key is not configured on the server.");
        return;
      }

      // Helper to call a specific model
      const callModel = async (modelId: string) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
        const requestBody = {
          contents: [{
            parts: [
              { text: `Analyze this image and extract all bill details with 100% accuracy.
              Return your response as a STRICTLY valid JSON object (no markdown, no preamble).
              The JSON must follow this exact structure:
              {
                "items": [{"id": "string", "name": "string", "price": number}],
                "tax": number,
                "serviceCharge": number,
                "tip": number,
                "discount": number,
                "subtotal": number,
                "restaurantName": "string"
              }` },
              { inlineData: { mimeType: "image/jpeg", data: base64Image } },
            ],
          }],
          generationConfig: { responseMimeType: "application/json" },
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) throw new Error(`Model ${modelId} failed: ${await response.text()}`);
        const data = await response.json();
        return JSON.parse(data.candidates[0].content.parts[0].text);
      };

      let result;
      let usedModel = "gemini-3.1-flash-lite-preview";

      try {
        logger.info("Attempting extraction with Lite model...");
        result = await callModel(usedModel);

        // If Lite returned no items, it likely struggled with the image
        if (!result.items || result.items.length === 0) {
          throw new Error("Lite model returned 0 items. Falling back...");
        }
      } catch (err) {
        logger.warn(`Lite model failed or returned empty: ${err}. Trying Flash...`);
        usedModel = "gemini-3-flash-preview";
        result = await callModel(usedModel);
      }

      logger.info(`Successfully processed bill using ${usedModel}`);
      res.status(200).json(result);
    } catch (error) {
      logger.error("All models failed to process bill:", error);
      res.status(500).send("Internal Server Error.");
    }
  }
);

/**
 * Venmo redirect for hyphenated usernames.
 * Serves a minimal HTML page that immediately redirects to venmo://paycharge,
 * bypassing the Android web intent handler that splits hyphenated usernames.
 *
 * Usage: /venmoRedirect?to=kalpita-sawant&amount=8.33&note=Dinner+at+Koi
 */
export const venmoRedirect = onRequest(
  { cors: true },
  async (req, res) => {
    const { to, amount, note } = req.query;

    if (!to || typeof to !== "string") {
      res.status(400).send("Missing 'to' parameter (Venmo username).");
      return;
    }

    // Build the venmo:// deep link
    // Force-encode hyphens as %2D — encodeURIComponent leaves them as-is
    // because they're "unreserved", but Venmo Android splits on literal hyphens.
    const encodedRecipient = encodeURIComponent(to).replace(/-/g, "%2D");
    const params = ["txn=pay", `recipients=${encodedRecipient}`];
    if (amount) params.push(`amount=${amount}`);
    if (note) params.push(`note=${encodeURIComponent(String(note))}`);
    const venmoDeepLink = `venmo://paycharge?${params.join("&")}`;

    // Build a fallback https link (profile only, for users without the app)
    const venmoWebFallback = `https://venmo.com/${encodeURIComponent(to)}`;

    // Build display text for link previews
    const displayAmount = amount ? `$${amount}` : "";
    const displayNote = note ? String(note) : "";
    const ogTitle = "FamilyStyle — Pay via Venmo";
    const ogDesc = displayAmount && displayNote ?
      `${displayNote} • ${displayAmount}` :
      displayAmount || displayNote || "Tap to open Venmo";

    // Serve a minimal HTML page that auto-redirects to the Venmo app
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${ogTitle}</title>
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDesc}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://familystyle-cfc4b.web.app/og-image.png">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="1024">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDesc}">
  <meta name="twitter:image" content="https://familystyle-cfc4b.web.app/og-image.png">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh; margin: 0;
      background: #f5f5f5; color: #333;
    }
    .card {
      text-align: center; padding: 40px; background: #fff;
      border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.1);
      max-width: 320px;
    }
    .btn {
      display: inline-block; margin-top: 20px; padding: 14px 32px;
      background: #008cff; color: #fff; border-radius: 12px;
      text-decoration: none; font-weight: 600; font-size: 16px;
    }
    .sub { margin-top: 16px; font-size: 13px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <p style="font-size:18px;font-weight:600;">Opening Venmo...</p>
    <a class="btn" href="${venmoDeepLink}">Open in Venmo</a>
    <p class="sub">
      Don't have the app?
      <a href="${venmoWebFallback}" style="color:#008cff;">Open on web</a>
    </p>
  </div>
  <script>
    // Immediately attempt to open the Venmo app
    window.location.href = "${venmoDeepLink}";
  </script>
</body>
</html>`;

    res.status(200).type("html").send(html);
  }
);
