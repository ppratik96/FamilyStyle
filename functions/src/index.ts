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

      // Read key from environment variable
      const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

      if (!apiKey) {
        logger.error("GEMINI_API_KEY is not set.");
        res.status(500).send("Gemini API key is not configured on the server.");
        return;
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: `Analyze this image and extract all bill details with 100% accuracy.
                
                Return your response as a STRICTLY valid JSON object (no markdown, no preamble).
                The JSON must follow this exact structure:
                {
                  "items": [
                    {
                      "id": "A unique string",
                      "name": "Item name (include quantity at start if > 1, e.g. '2 Saganaki')",
                      "price": total_line_price_as_number
                    }
                  ],
                  "tax": total_tax_number,
                  "serviceCharge": total_service_fee_number,
                  "tip": tip_amount_number,
                  "discount": total_discount_amount_as_positive_number_or_zero,
                  "subtotal": the_subtotal_before_tax_and_discounts,
                  "restaurantName": "The name of the restaurant or merchant"
                }
                
                IMPORTANT: 
                1. Do not use currency symbols.
                2. Do not include 'Total' or 'Subtotal' in the items array.
                3. Return ONLY the JSON object.
                4. Exclude discounts from the items array. They should ONLY be in the discount field.`,
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        logger.error(`Gemini API Error (${response.status}):`, errText);
        res.status(response.status).send(`Gemini API error: ${errText}`);
        return;
      }

      const data = await response.json();
      const textResponse = data.candidates[0].content.parts[0].text;

      let parsedData;
      try {
        parsedData = JSON.parse(textResponse);
      } catch (e) {
        logger.error("Failed to parse JSON from Gemini:", textResponse);
        res.status(500).send("Invalid response format from Gemini.");
        return;
      }

      res.status(200).json(parsedData);
    } catch (error) {
      logger.error("Error processing bill with Gemini:", error);
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
