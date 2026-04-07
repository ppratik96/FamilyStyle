import { BillItem } from "../types";
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
export const mockProcessBill = async (imageUri: string): Promise<{ items: BillItem[], tax: number, serviceCharge: number, tip: number, restaurantName?: string }> => {
    return processWithGemini(imageUri);
};
const processWithGemini = async (imageUri: string, isRetry = false): Promise<{ items: BillItem[], tax: number, serviceCharge: number, tip: number, restaurantName?: string }> => {
    try {
        const manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 1200 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );

        const base64Image = await FileSystem.readAsStringAsync(manipResult.uri, {
            encoding: 'base64',
        });

        // The secure backend endpoint we just deployed
        const url = 'https://us-central1-familystyle-cfc4b.cloudfunctions.net/processBillWithGemini';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64Image })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Backend API Error (${response.status}):`, errText);

            // Retry for 503 or 429
            if ((response.status === 429 || response.status === 503) && !isRetry) {
                console.warn(`Caught ${response.status}. Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return processWithGemini(imageUri, true);
            }
            
            throw new Error(`Secure Backend Error ${response.status}: ${errText}`);
        }

        // The backend already parses the Gemini text into strict JSON!
        const parsedData = await response.json();

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
        console.error("Error processing bill with secure backend:", error);
        throw error;
    }
};
