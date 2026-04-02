import { BillItem } from "../types";
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
export const mockProcessBill = async (imageUri: string): Promise<{ items: BillItem[], tax: number, serviceCharge: number, tip: number, restaurantName?: string }> => {
    return processWithGemini(imageUri);
};
const processWithGemini = async (imageUri: string, isRetry = false): Promise<{ items: BillItem[], tax: number, serviceCharge: number, tip: number, restaurantName?: string }> => {
    try {
        const rawApiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        const apiKey = rawApiKey?.replace(/['"]+/g, '').trim();
        
        if (!apiKey) {
            throw new Error("Gemini API key is not configured.");
        }

        const manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 1200 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );

        const base64Image = await FileSystem.readAsStringAsync(manipResult.uri, {
            encoding: 'base64',
        });

        // Using exactly what's in your account's authorized model list
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `Analyze this image and extract all bill details with 100% accuracy.
                            
                            Return your response as a STRIClTY valid JSON object (no markdown, no preamble).
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
                              "restaurantName": "The name of the restaurant or merchant"
                            }
                            
                            IMPORTANT: 
                            1. Do not use currency symbols.
                            2. Do not include 'Total' or 'Subtotal' in the items array.
                            3. Return ONLY the JSON object.`
                        },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: base64Image
                            }
                        }
                    ]
                }
            ]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Gemini API Error (${response.status}):`, errText);

            // Retry for 503 (Busy) or 429 (Rate Limit)
            if ((response.status === 429 || response.status === 503) && !isRetry) {
                console.warn(`Caught ${response.status}. Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return processWithGemini(imageUri, true);
            }
            
            throw new Error(`Gemini API returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        
        let parsedData;
        try {
            // Strip markdown formatting that Gemini sometimes includes
            let cleanText = textResponse.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
            // Fallback for simple backticks without 'json'
            cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
            
            parsedData = JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse JSON from Gemini:", textResponse);
            throw new Error("Invalid response format from Gemini.");
        }

        return {
            items: parsedData.items.map((item: any) => ({
                id: item.id || Math.random().toString(36).substring(7),
                name: item.name,
                price: typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0,
                assignedTo: []
            })),
            tax: typeof parsedData.tax === 'number' ? parsedData.tax : parseFloat(parsedData.tax) || 0,
            serviceCharge: typeof parsedData.serviceCharge === 'number' ? parsedData.serviceCharge : parseFloat(parsedData.serviceCharge) || 0,
            tip: typeof parsedData.tip === 'number' ? parsedData.tip : parseFloat(parsedData.tip) || 0,
            restaurantName: parsedData.restaurantName || undefined
        };

    } catch (error) {
        console.error("Error processing bill with Gemini:", error);
        throw error;
    }
};
