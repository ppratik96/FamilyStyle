import * as Contacts from 'expo-contacts';
import * as FileSystem from 'expo-file-system/legacy';
import { User } from '../types';

export const getContacts = async (): Promise<User[]> => {
    const { status } = await Contacts.requestPermissionsAsync();

    if (status === 'granted') {
        const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Image],
        });

        if (data.length > 0) {
            const frequencies = await getContactFrequencies();
            
            return data
                .filter(contact => contact.phoneNumbers && contact.phoneNumbers.length > 0)
                .map(contact => ({
                    id: contact.id || Math.random().toString(),
                    name: contact.name || 'Unknown',
                    phoneNumber: contact.phoneNumbers ? (contact.phoneNumbers[0].number || '') : '',
                    initials: getInitials(contact.name || ''),
                }))
                .sort((a, b) => {
                    const freqA = frequencies[a.id] || 0;
                    const freqB = frequencies[b.id] || 0;
                    if (freqA !== freqB) return freqB - freqA; // Sort by frequency descending
                    return a.name.localeCompare(b.name); // Then alphabetically
                });
        }
    }
    return [];
};

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
};

const FREQUENCIES_FILE = `${FileSystem.documentDirectory}contactFrequencies.json`;

export const getContactFrequencies = async (): Promise<Record<string, number>> => {
    try {
        const info = await FileSystem.getInfoAsync(FREQUENCIES_FILE);
        if (info.exists) {
            const content = await FileSystem.readAsStringAsync(FREQUENCIES_FILE);
            return JSON.parse(content);
        }
    } catch (e) {
        console.error('Failed to read contact frequencies:', e);
    }
    return {};
};

export const incrementContactFrequency = async (contactId: string) => {
    try {
        const freqs = await getContactFrequencies();
        freqs[contactId] = (freqs[contactId] || 0) + 1;
        await FileSystem.writeAsStringAsync(FREQUENCIES_FILE, JSON.stringify(freqs));
    } catch (e) {
        console.error('Failed to save contact frequency:', e);
    }
};
