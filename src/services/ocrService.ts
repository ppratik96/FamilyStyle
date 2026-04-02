import { BillItem } from "../types";
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
export const mockProcessBill = async (imageUri: string): Promise<{ items: BillItem[], tax: number, serviceCharge: number, tip: number }> => {
    return processWithGemini(imageUri);
};
const processWithGemini = async (imageUri: string, isRetry = false): Promise<{ items: BillItem[], tax: number, serviceCharge: number, tip: number }> => {
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

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `You are a professional receipt-parsing agent. Analyze this image and extract all bill details with 100% accuracy.
                            
                            Return a strictly valid JSON object with:
                            - "items": Array of objects. Each object MUST have:
                                - "id": A unique string (e.g. "item_1")
                                - "name": The line item name. Include the quantity at the start if multiple (e.g. "2 Saganaki").
                                - "price": The total price for that line item as a number (no symbols).
                            - "tax": The total tax amount as a number.
                            - "serviceCharge": The total service fee or mandatory charge, if any.
                            - "tip": The tip or gratuity amount, if found.
                            
                            IMPORTANT: 
                            1. Do not include currency symbols.
                            2. Do not include the "Total" or "Subtotal" as an entry in the items array.
                            3. Double-check all math.
                            4. If an item is unclear, provide your best guess based on the context of other items.
                            5. Return ONLY the JSON object. No markdown, no pre-text.`
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
                response_mime_type: "application/json"
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Gemini API Error (${response.status}):`, errText);
            throw new Error(`Gemini API returned ${response.status}: ${errText}`);
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
        throw error;
    }
};
