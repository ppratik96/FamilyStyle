import { BillItem } from "../types";
import * as FileSystem from 'expo-file-system/legacy';

export const mockProcessBill = async (imageUri: string): Promise<{ items: BillItem[], tax: number, serviceCharge: number, tip: number }> => {
    try {
        const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("Gemini API key is not configured.");
        }

        // Read image to base64
        const base64Image = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
        });

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `Analyze this receipt. Return a JSON object representing the bill. The JSON must strictly contain:
- "items": an array of objects. Each object must have "id" (a random unique string), "name" (string), and "price" (number). Do not include tax or tip in this array.
- "tax": number (the total tax amount).
- "serviceCharge": number (the total service charge or mandatory fee, if any).
- "tip": number (the tip amount, or 0 if none is found).
Do not include any currency symbols in the numbers.`
                        },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: base64Image
                            }
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        
        let parsedData;
        try {
            parsedData = JSON.parse(textResponse);
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
            tip: typeof parsedData.tip === 'number' ? parsedData.tip : parseFloat(parsedData.tip) || 0
        };

    } catch (error) {
        console.error("Error processing bill with Gemini:", error);
        
        // Fallback or re-throw
        throw error;
    }
};
