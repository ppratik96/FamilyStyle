import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryItem, Metrics } from '../types';

const HISTORY_STORAGE_KEY = '@family_style_bill_history';

export const HistoryService = {
    async saveBillToHistory(bill: Omit<HistoryItem, 'id' | 'date'>): Promise<void> {
        try {
            const existingHistory = await this.getHistory();
            const newBill: HistoryItem = {
                ...bill,
                id: Math.random().toString(36).substring(7) + Date.now().toString(36),
                date: Date.now(),
            };
            
            const updatedHistory = [newBill, ...existingHistory];
            await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error('Failed to save bill to history:', error);
        }
    },

    async getHistory(): Promise<HistoryItem[]> {
        try {
            const historyStr = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
            return historyStr ? JSON.parse(historyStr) : [];
        } catch (error) {
            console.error('Failed to load history:', error);
            return [];
        }
    },

    async deleteBill(billId: string): Promise<void> {
        try {
            const existingHistory = await this.getHistory();
            const updatedHistory = existingHistory.filter(bill => bill.id !== billId);
            await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
        } catch (error) {
            console.error('Failed to delete bill from history:', error);
        }
    },

    async clearHistory(): Promise<void> {
        try {
            await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    },

    async getMetrics(): Promise<Metrics> {
        const history = await this.getHistory();
        
        if (history.length === 0) {
            return {
                totalBillsSplit: 0,
                totalSpent: 0,
            };
        }

        const totalSpent = history.reduce((sum, item) => sum + item.totalAmount, 0);
        
        // Find most visited restaurant
        const restaurantCounts: Record<string, number> = {};
        history.forEach(item => {
            if (item.restaurantName) {
                restaurantCounts[item.restaurantName] = (restaurantCounts[item.restaurantName] || 0) + 1;
            }
        });
        
        let mostVisitedRestaurant: string | undefined;
        let maxRCount = 0;
        Object.entries(restaurantCounts).forEach(([name, count]) => {
            if (count > maxRCount) {
                maxRCount = count;
                mostVisitedRestaurant = name;
            }
        });

        // Find most split with user
        const userCounts: Record<string, number> = {};
        history.forEach(item => {
            item.users.forEach(user => {
                if (user.id !== 'me') {
                    userCounts[user.name] = (userCounts[user.name] || 0) + 1;
                }
            });
        });

        let mostSplitWith: string | undefined;
        let maxUCount = 0;
        Object.entries(userCounts).forEach(([name, count]) => {
            if (count > maxUCount) {
                maxUCount = count;
                mostSplitWith = name;
            }
        });

        return {
            totalBillsSplit: history.length,
            totalSpent,
            mostVisitedRestaurant,
            mostSplitWith,
        };
    }
};
