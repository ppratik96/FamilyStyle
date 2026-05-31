export interface User {
    id: string;
    name: string;
    phoneNumber?: string;
    initials?: string;
}

export interface BillItem {
    id: string;
    name: string;
    price: number;
    assignedTo: string[]; // Array of User IDs
    isGroup?: boolean;
    parentId?: string;
}

export interface BillStatus {
    subtotal: number;
    tax: number;
    total: number;
}

export interface HistoryItem {
    id: string;
    date: number; // timestamp
    restaurantName?: string;
    totalAmount: number;
    subtotal: number;
    tax: number;
    tip: number;
    serviceCharge: number;
    discount: number;
    items?: BillItem[];
    users: {
        id: string;
        name: string;
        amount: number;
        wasRequested: boolean;
        phoneNumber?: string;
    }[];
}

export interface Metrics {
    totalBillsSplit: number;
    totalSpent: number;
    mostVisitedRestaurant?: string;
    mostSplitWith?: string;
}
