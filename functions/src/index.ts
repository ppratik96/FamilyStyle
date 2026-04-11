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
