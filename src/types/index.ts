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
