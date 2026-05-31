import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Share, Alert, Platform, Pressable } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Share as ShareIcon, Home, Copy, Send, Check, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillItem, User } from '../types';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import ReceiptViewer from '../components/ReceiptViewer';
import { useTheme } from '../ThemeContext';
import { OutlinedText } from '../components/OutlinedText';
import { HistoryService } from '../services/historyService';

// Use the loaded font names from App.tsx (expo-google-fonts)
const NEWSREADER_BOLD = 'Newsreader_700Bold';
const NEWSREADER_ITALIC_BOLD = 'Newsreader_700Bold_Italic';
const NEWSREADER_REGULAR = 'Newsreader_400Regular';

// High-end distinct palette helper
const getUserColor = (userId: string) => {
    if (!userId || userId === 'me') return { bg: '#ffffff', border: '#85341f' };
    const colors = [
        { bg: '#e1f5ed', border: '#acdcc8' }, // Mint
        { bg: '#eef2e1', border: '#cdd6b2' }, // Olive-ish
        { bg: '#f5f0e1', border: '#dac99f' }, // Clay/Sand
        { bg: '#faecec', border: '#e8afaf' }, // Soft Rose
        { bg: '#e1f0f5', border: '#b2d5e0' }, // Sky Blue
        { bg: '#f0e1fa', border: '#ccaae8' }, // Lavender
        { bg: '#f5e9e1', border: '#e6c2ad' }, // Peachy
        { bg: '#e1ebe1', border: '#bccbbc' }, // Sage
    ];
    const index = (userId.charCodeAt(0) + userId.length) % colors.length;
    return colors[index];
};

export default function ResultScreen({ navigation, route }: any) {
    const { items = [], users = [], imageUri, restaurantName } = route.params || {};
    const initialTax = Number(route.params?.tax) || 0;
    const initialServiceCharge = Number(route.params?.serviceCharge) || 0;
    const initialTip = Number(route.params?.tip) || 0;
    const initialDiscount = Number(route.params?.discount) || 0;

    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    const subtotal = (items || []).reduce((sum: number, item: BillItem) => sum + (Number(item.price) || 0), 0);

    const [taxAmount, setTaxAmount] = useState(initialTax.toFixed(2));
    const [serviceChargeAmount, setServiceChargeAmount] = useState(initialServiceCharge.toFixed(2));
    const [tipAmount, setTipAmount] = useState(initialTip.toFixed(2));
    const [discountAmount, setDiscountAmount] = useState(initialDiscount.toFixed(2));
    const [venmoUsername, setVenmoUsername] = useState('');
    const [paymentNote, setPaymentNote] = useState(restaurantName ? `Dinner at ${restaurantName}` : '');
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});
    const [sentUsers, setSentUsers] = useState<Record<string, boolean>>({});
    const [sharingMode, setSharingMode] = useState<"individual" | "group">("individual");
    const [hasSharedSummary, setHasSharedSummary] = useState(false);

    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedVenmo = await AsyncStorage.getItem('venmoUsername');
                if (savedVenmo) {
                    setVenmoUsername(savedVenmo);
                }
            } catch (e) {
                console.error("Failed to load saved Venmo", e);
            }
        };
        loadSettings();
    }, []);

    const saveVenmoUsername = async (text: string) => {
        setVenmoUsername(text);
        try {
            await AsyncStorage.setItem('venmoUsername', text);
        } catch (e) {
            // silent fail
        }
    };

    const calculateUserTotal = (userId: string) => {
        if (!items || items.length === 0) {
            return { items: 0, tax: 0, serviceCharge: 0, tip: 0, discount: 0, total: 0 };
        }

        const itemTotal = items.reduce((total: number, item: BillItem) => {
            const assigned = item.assignedTo || [];
            const userShares = assigned.filter(id => id === userId).length;
            if (userShares > 0) {
                return total + (((Number(item.price) || 0) / assigned.length) * userShares);
            }
            return total;
        }, 0);

        const currentTaxAmount = parseFloat(taxAmount) || 0;
        const currentServiceChargeAmount = parseFloat(serviceChargeAmount) || 0;
        const currentTipAmount = parseFloat(tipAmount) || 0;
        const currentDiscountAmount = parseFloat(discountAmount) || 0;

        // Calculate proportions based on subtotal
        const userProportion = subtotal > 0 ? itemTotal / subtotal : 0;

        const tax = currentTaxAmount * userProportion;
        const serviceCharge = currentServiceChargeAmount * userProportion;
        const tip = currentTipAmount * userProportion;
        const discount = currentDiscountAmount * userProportion;

        const total = itemTotal + tax + serviceCharge + tip - discount;

        return {
            items: itemTotal,
            tax,
            serviceCharge,
            tip,
            discount,
            total: isNaN(total) ? 0 : Math.max(0, total)
        };
    };

    const buildVenmoUrl = (username: string, amount?: number, note?: string) => {
        const cleanUsername = username.trim().replace('@', '');
        const params = [`txn=pay`, `recipients=${cleanUsername}`];
        if (amount !== undefined) params.push(`amount=${amount.toFixed(2)}`);
        // Use non-breaking spaces to prevent Venmo from turning them into plus signs
        const encodedNote = note ? encodeURIComponent(note.replace(/ /g, '\u00A0')) : '';
        if (encodedNote) params.push(`note=${encodedNote}`);
        return `https://venmo.com/?${params.join('&')}`;
    };

    const generateSummary = () => {
        const note = paymentNote.trim() || 'Bill Summary';
        let summary = `🍽️ ${note}\n\n`;
        users.forEach((user: User) => {
            if (user.id === 'me') return;
            const { total } = calculateUserTotal(user.id);
            if (total > 0) {
                summary += `${user.name}: $${total.toFixed(2)}\n`;
            }
        });

        if (venmoUsername.trim()) {
            const cleanUsername = venmoUsername.trim().replace('@', '');
            summary += `\nPay via Venmo (@${cleanUsername}): ${buildVenmoUrl(venmoUsername)}`;
        }

        summary += `\n\nSplit using https://TheFamilyStyle.app`;
        return summary;
    };

    const shareViaSystem = async () => {
        try {
            await Share.share({
                message: generateSummary(),
            });
            setHasSharedSummary(true);
        } catch (error) {
            Alert.alert('Error', 'Could not share summary');
        }
    };

    const shareViaSMS = async () => {
        try {
            const isAvailable = await SMS.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'SMS is not available on this device');
                return;
            }

            const summary = generateSummary();
            const recipients = (users as User[])
                .filter((u: User) => u.id !== 'me' && u.phoneNumber && u.phoneNumber.trim().length > 0)
                .map((u: User) => u.phoneNumber as string);

            const { result } = await SMS.sendSMSAsync(recipients, summary);
            if (result !== 'cancelled') {
                setHasSharedSummary(true);
            }
        } catch (error) {
            console.error("SMS Group Error:", error);
            Alert.alert('Error', 'Could not open SMS app');
        }
    };

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(generateSummary());
        Alert.alert('Copied', 'Summary copied to clipboard!');
    };

    const sendRequest = async (user: User, amount: number) => {
        try {
            const isAvailable = await SMS.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'SMS is not available on this device');
                return;
            }

            const recipients = user.phoneNumber ? [user.phoneNumber] : [];
            const note = paymentNote.trim() || 'the bill';
            let message = `Hey, your share of ${note} is $${amount.toFixed(2)}.`;

            if (venmoUsername.trim()) {
                const cleanUsername = venmoUsername.trim().replace('@', '');
                message += ` You can venmo me (@${cleanUsername}) here: ${buildVenmoUrl(venmoUsername, amount, note)}`;
            }

            message += `\n\nSplit using https://TheFamilyStyle.app`;

            const { result } = await SMS.sendSMSAsync(recipients, message);

            // Only mark as sent if the composer was at least opened/sent
            if (result !== 'cancelled') {
                setSentUsers(prev => ({ ...prev, [user.id]: true }));
            }
        } catch (error) {
            console.error("SMS Error:", error);
            Alert.alert('Error', 'Could not open SMS app');
        }
    };

    const sendDetailedRequest = async (user: User, totals: any) => {
        try {
            const isAvailable = await SMS.isAvailableAsync();
            if (!isAvailable) {
                Alert.alert('Error', 'SMS is not available on this device');
                return;
            }

            const recipients = user.phoneNumber ? [user.phoneNumber] : [];
            const note = paymentNote.trim() || 'the bill';

            let message = `Hey, your share of ${note} is $${totals.total.toFixed(2)}.\n\nHere is your breakdown:\n`;

            const userItems = items.filter((i: BillItem) => i.assignedTo.includes(user.id));
            userItems.forEach((item: BillItem) => {
                const assigned = item.assignedTo || [];
                const userShares = assigned.filter(id => id === user.id).length;
                const sharePrice = ((Number(item.price) || 0) / (assigned.length || 1)) * userShares;
                message += `- ${userShares > 1 ? `${userShares}x ` : ''}${item.name}: $${sharePrice.toFixed(2)}\n`;
            });

            message += `\nFees & Adjustments:\n`;
            message += `- Taxes & Fees: $${(totals.tax + totals.serviceCharge + totals.tip).toFixed(2)}\n`;
            if (totals.discount > 0) {
                message += `- Discount: -$${totals.discount.toFixed(2)}\n`;
            }

            if (venmoUsername.trim()) {
                const cleanUsername = venmoUsername.trim().replace('@', '');
                message += `\nYou can venmo me (@${cleanUsername}) here: ${buildVenmoUrl(venmoUsername, totals.total, note)}`;
            }

            message += `\n\nSplit using https://TheFamilyStyle.app`;

            const { result } = await SMS.sendSMSAsync(recipients, message);

            if (result !== 'cancelled') {
                setSentUsers(prev => ({ ...prev, [user.id]: true }));
            }
        } catch (error) {
            console.error("SMS Error:", error);
            Alert.alert('Error', 'Could not open SMS app');
        }
    };

    const payableUsers = users.filter((u: User) => u.id !== 'me' && calculateUserTotal(u.id).total > 0);
    const isAllSent = payableUsers.length > 0 && payableUsers.every((u: User) => sentUsers[u.id]);
    const isReadyToFinish = hasSharedSummary || isAllSent || payableUsers.length === 0;

    return (
        <NavigationContext.Provider value={navigation}>
            <NavigationRouteContext.Provider value={route}>
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={{ flex: 1 }}>
                        <StatusBar style={isDark ? 'light' : 'dark'} />
                        <View style={{ paddingTop: insets.top, flex: 1 }}>
                            {/* Header */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.background, zIndex: 10, width: '100%' }}>
                                <TouchableOpacity
                                    onPress={() => navigation.goBack()}
                                    className="w-11 h-11 items-center justify-center rounded-full active:scale-95 shadow-sm border border-outline-variant/30"
                                    style={{ backgroundColor: colors.surface }}
                                    activeOpacity={0.7}
                                >
                                    <ArrowLeft size={24} color={isDark ? 'white' : colors.primary} />
                                </TouchableOpacity>
                                <Text className="italic font-bold font-headline-italic" style={{ fontSize: 22, color: isDark ? 'white' : colors.primary }}>Final Tally</Text>
                                <View className="flex-row items-center">
                                    <ReceiptViewer imageUri={imageUri} />
                                </View>
                            </View>

                            <ScrollView className="flex-1 px-6 mt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 220 }}>
                                {/* Global Settings & Payment */}
                                <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                    <Text style={{ color: isDark ? 'white' : colors.primary, fontSize: 20, fontFamily: NEWSREADER_BOLD, marginBottom: 20 }}>Adjustments & Payment</Text>

                                    <View className="space-y-4">
                                        {/* Adjustment Row: Discount */}
                                        <View className="flex-row justify-between items-center mb-3">
                                            <View className="flex-1">
                                                <Text className="font-body font-bold text-base" style={{ color: colors.onSurface, opacity: 0.8 }}>Discount</Text>
                                                <Text className="text-xs font-body" style={{ color: isDark ? colors.muted : colors.primary, opacity: isDark ? 1 : 0.5 }}>{subtotal > 0 ? ((parseFloat(discountAmount) || 0) / subtotal * 100).toFixed(2) : 0}%</Text>
                                            </View>
                                            <View className="border border-outline-variant/30 rounded-xl px-3 py-1 w-24 flex-row items-center" style={{ backgroundColor: isDark ? '#4a3b38' : colors.surfaceContainerLow }}>
                                                <Text className="text-green-700 font-body-bold text-base mr-0.5" style={{ transform: [{ translateY: 3 }] }}>-</Text>
                                                <Text className="font-body-bold text-base mr-1" style={{ color: isDark ? 'white' : colors.primary, transform: [{ translateY: 3 }] }}>$</Text>
                                                <TextInput
                                                    value={discountAmount}
                                                    onChangeText={setDiscountAmount}
                                                    keyboardType="decimal-pad"
                                                    className="text-right font-body-bold text-base flex-1"
                                                    style={{ color: colors.success, padding: 0, height: 32 }}
                                                />
                                            </View>
                                        </View>

                                        {/* Adjustment Row: Taxes */}
                                        <View className="flex-row justify-between items-center mb-3">
                                            <View className="flex-1">
                                                <Text className="font-body font-bold text-base" style={{ color: colors.onSurface, opacity: 0.8 }}>Taxes & Fees</Text>
                                                <Text className="text-xs font-body" style={{ color: isDark ? colors.muted : colors.primary, opacity: isDark ? 1 : 0.5 }}>{subtotal > 0 ? ((parseFloat(taxAmount) || 0) / subtotal * 100).toFixed(2) : 0}%</Text>
                                            </View>
                                            <View className="border border-outline-variant/30 rounded-xl px-3 py-1 w-24 flex-row items-center" style={{ backgroundColor: isDark ? '#4a3b38' : colors.surfaceContainerLow }}>
                                                <Text className="font-body-bold text-base mr-1" style={{ color: isDark ? 'white' : colors.primary, transform: [{ translateY: 3 }] }}>$</Text>
                                                <TextInput
                                                    value={taxAmount}
                                                    onChangeText={setTaxAmount}
                                                    keyboardType="decimal-pad"
                                                    className="text-right font-body-bold text-base flex-1"
                                                    style={{ color: colors.onSurface, padding: 0, height: 32 }}
                                                />
                                            </View>
                                        </View>

                                        {/* Adjustment Row: Service Charge */}
                                        <View className="flex-row justify-between items-center mb-3">
                                            <View className="flex-1">
                                                <Text className="font-body font-bold text-base" style={{ color: colors.onSurface, opacity: 0.8 }}>Service Charge</Text>
                                                <Text className="text-xs font-body" style={{ color: isDark ? colors.muted : colors.primary, opacity: isDark ? 1 : 0.5 }}>{subtotal > 0 ? ((parseFloat(serviceChargeAmount) || 0) / subtotal * 100).toFixed(2) : 0}%</Text>
                                            </View>
                                            <View className="border border-outline-variant/30 rounded-xl px-3 py-1 w-24 flex-row items-center" style={{ backgroundColor: isDark ? '#4a3b38' : colors.surfaceContainerLow }}>
                                                <Text className="font-body-bold text-base mr-1" style={{ color: isDark ? 'white' : colors.primary, transform: [{ translateY: 3 }] }}>$</Text>
                                                <TextInput
                                                    value={serviceChargeAmount}
                                                    onChangeText={setServiceChargeAmount}
                                                    keyboardType="decimal-pad"
                                                    className="text-right font-body-bold text-base flex-1"
                                                    style={{ color: colors.onSurface, padding: 0, height: 32 }}
                                                />
                                            </View>
                                        </View>

                                        {/* Adjustment Row: Tip */}
                                        <View className="flex-row justify-between items-center mb-6">
                                            <View className="flex-1">
                                                <Text className="font-body font-bold text-base" style={{ color: colors.onSurface, opacity: 0.8 }}>Tip</Text>
                                                <Text className="text-xs font-body" style={{ color: isDark ? colors.muted : colors.primary, opacity: isDark ? 1 : 0.5 }}>{subtotal > 0 ? ((parseFloat(tipAmount) || 0) / subtotal * 100).toFixed(2) : 0}%</Text>
                                            </View>
                                            <View className="border border-outline-variant/30 rounded-xl px-3 py-1 w-24 flex-row items-center" style={{ backgroundColor: isDark ? '#4a3b38' : colors.surfaceContainerLow }}>
                                                <Text className="font-body-bold text-base mr-1" style={{ color: isDark ? 'white' : colors.primary, transform: [{ translateY: 3 }] }}>$</Text>
                                                <TextInput
                                                    value={tipAmount}
                                                    onChangeText={setTipAmount}
                                                    keyboardType="decimal-pad"
                                                    className="text-right font-body-bold text-base flex-1"
                                                    style={{ color: colors.onSurface, padding: 0, height: 32 }}
                                                />
                                            </View>
                                        </View>

                                        <View className="h-[1px] bg-outline-variant/30 w-full my-1" />

                                        {/* Venmo Row */}
                                        <View className="flex-row items-center mt-4">
                                            <Text className="font-body font-bold text-base w-24" style={{ color: colors.onSurface, opacity: 0.8 }}>Venmo</Text>
                                            <View className="border border-outline-variant/30 rounded-xl px-3 py-1 flex-1 flex-row items-center" style={{ backgroundColor: isDark ? '#4a3b38' : colors.surfaceContainerLow }}>
                                                <Text className="font-body-bold text-base mr-1" style={{ color: isDark ? 'white' : colors.primary, transform: [{ translateY: 3 }] }}>@</Text>
                                                <TextInput
                                                    value={venmoUsername}
                                                    onChangeText={saveVenmoUsername}
                                                    placeholder="yourusername"
                                                    placeholderTextColor="#a1a1aa"
                                                    className="font-body-bold text-base flex-1"
                                                    autoCapitalize="none"
                                                    autoCorrect={false}
                                                    style={{ color: colors.onSurface, padding: 0, height: 32 }}
                                                />
                                            </View>
                                        </View>

                                        {/* Description Row */}
                                        <View className="flex-row items-center mt-4">
                                            <Text className="font-body font-bold text-base w-24" style={{ color: colors.onSurface, opacity: 0.8 }}>Description</Text>
                                            <View className="border border-outline-variant/30 rounded-xl px-3 py-1 flex-1 flex-row items-center" style={{ backgroundColor: isDark ? '#4a3b38' : colors.surfaceContainerLow }}>
                                                <TextInput
                                                    value={paymentNote}
                                                    onChangeText={setPaymentNote}
                                                    placeholder="Dinner at Saganaki..."
                                                    placeholderTextColor="#a1a1aa"
                                                    className="font-body-bold text-base flex-1"
                                                    style={{ color: colors.onSurface, padding: 0, height: 32 }}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Sharing Mode Toggle */}
                                <View className="flex-row bg-surface-container-low p-1.5 rounded-2xl mb-8 border border-outline-variant/20" style={{ backgroundColor: isDark ? '#2b2220' : '#f6f3ee' }}>
                                    <TouchableOpacity 
                                        onPress={() => setSharingMode('individual')}
                                        activeOpacity={0.8}
                                        className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${sharingMode === 'individual' ? 'bg-primary shadow-md' : ''}`}
                                        style={sharingMode === 'individual' ? { shadowColor: '#85341f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 } : {}}
                                    >
                                        <Send size={14} color={sharingMode === 'individual' ? 'white' : (isDark ? 'white' : colors.primary)} style={{ opacity: sharingMode === 'individual' ? 1 : 0.6 }} />
                                        <Text 
                                            className="font-body-bold ml-2 text-sm"
                                            style={{ 
                                                color: sharingMode === 'individual' ? 'white' : (isDark ? 'white' : colors.primary),
                                                opacity: sharingMode === 'individual' ? 1 : (isDark ? 0.6 : 1)
                                            }}
                                        >
                                            Individual
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        onPress={() => setSharingMode('group')}
                                        activeOpacity={0.8}
                                        className={`flex-1 py-3 rounded-xl items-center flex-row justify-center ${sharingMode === 'group' ? 'bg-primary shadow-md' : ''}`}
                                        style={sharingMode === 'group' ? { shadowColor: '#85341f', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 } : {}}
                                    >
                                        <MessageSquare size={14} color={sharingMode === 'group' ? 'white' : (isDark ? 'white' : colors.primary)} style={{ opacity: sharingMode === 'group' ? 1 : 0.6 }} />
                                        <Text 
                                            className="font-body-bold ml-2 text-sm"
                                            style={{ 
                                                color: sharingMode === 'group' ? 'white' : (isDark ? 'white' : colors.primary),
                                                opacity: sharingMode === 'group' ? 1 : (isDark ? 0.6 : 1)
                                            }}
                                        >
                                            Group Chat
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {sharingMode === 'group' ? (
                                    <View className="px-2">
                                        <View className="flex-row gap-3 mb-6">
                                            <TouchableOpacity
                                                onPress={shareViaSMS}
                                                className="flex-1 bg-primary py-4 rounded-2xl flex-row items-center justify-center active:scale-95"
                                                style={{
                                                    shadowColor: '#85341f',
                                                    shadowOffset: { width: 0, height: 4 },
                                                    shadowOpacity: 0.3,
                                                    shadowRadius: 8,
                                                    elevation: 6,
                                                }}
                                            >
                                                <MessageSquare size={18} color="white" />
                                                <Text className="text-white font-body-bold text-base ml-2">Text Group</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                onPress={shareViaSystem}
                                                className="flex-1 py-4 rounded-2xl flex-row items-center justify-center active:scale-95 border-2"
                                                style={{ 
                                                    backgroundColor: isDark ? colors.outlineVariant + '33' : 'transparent',
                                                    borderColor: colors.primary + '40'
                                                }}
                                            >
                                                <ShareIcon size={18} color={isDark ? 'white' : colors.primary} />
                                                <Text className="font-body-bold text-base ml-2" style={{ color: isDark ? 'white' : colors.primary }}>Share Totals</Text>
                                            </TouchableOpacity>
                                        </View>

                                        {/* Group Summary Preview */}
                                        <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                            <Text className="font-body-bold mb-4" style={{ color: isDark ? 'white' : colors.primary, fontSize: 16, opacity: 0.8 }}>FINAL TALLY</Text>
                                            {(users as User[]).filter((u: User) => u.id !== 'me').map((user: User, idx: number) => {
                                                const total = calculateUserTotal(user.id).total;
                                                if (total === 0) return null;
                                                return (
                                                    <View key={user.id} className="flex-row justify-between items-center mb-3">
                                                        <Text className="font-body text-base" style={{ color: colors.onSurface }}>{user.name}</Text>
                                                        <Text className="font-body-bold text-base" style={{ color: colors.onSurface }}>${total.toFixed(2)}</Text>
                                                    </View>
                                                );
                                            })}
                                            <View className="h-[1px] bg-outline-variant/20 w-full my-3" />
                                            <View className="flex-row justify-between items-center">
                                                <Text className="font-body-bold text-lg" style={{ color: isDark ? 'white' : colors.primary }}>Group Total</Text>
                                                <Text className="font-body-bold text-lg" style={{ color: isDark ? 'white' : colors.primary }}>
                                                    ${(users as User[]).filter((u: User) => u.id !== 'me').reduce((acc: number, u: User) => acc + calculateUserTotal(u.id).total, 0).toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        {users.map((user: User, index: number) => {
                                            const totals = calculateUserTotal(user.id);
                                            if (user.id !== 'me' && totals.total === 0) return null;

                                            return (
                                                <View key={user.id} style={{ backgroundColor: colors.surface, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: colors.outlineVariant + '33', overflow: 'hidden' }}>
                                                    <TouchableOpacity
                                                        onPress={() => setExpandedUsers(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                                                        activeOpacity={0.7}
                                                        className="p-6 pb-5"
                                                    >
                                                        <View className="flex-row justify-between items-center">
                                                            <View className="flex-row items-center flex-1 pr-4">
                                                                {(() => {
                                                                    const userColor = getUserColor(user.id);
                                                                    return (
                                                                        <View
                                                                            style={{
                                                                                width: 48,
                                                                                height: 48,
                                                                                borderRadius: 24,
                                                                                backgroundColor: userColor.bg,
                                                                                borderWidth: 1.5,
                                                                                borderColor: userColor.border,
                                                                                justifyContent: 'center',
                                                                                alignItems: 'center',
                                                                                marginRight: 16
                                                                            }}
                                                                        >
                                                                            <Text style={{ fontWeight: '700', fontSize: 18, color: colors.primary }}>{user.initials}</Text>
                                                                        </View>
                                                                    );
                                                                })()}
                                                                <Text className="font-body-bold text-xl flex-1" numberOfLines={1} style={{ color: colors.onSurface }}>{user.name}</Text>
                                                            </View>
                                                            <View className="flex-row items-center">
                                                                    <View className="flex-row items-baseline">
                                                                    <Text className="font-body font-bold text-lg mr-0.5" style={{ color: isDark ? 'white' : colors.primary, transform: [{ translateY: -1 }] }}>$</Text>
                                                                    <Text className="text-2xl font-body font-bold" style={{ color: isDark ? 'white' : colors.primary }}>
                                                                        {totals.total.toFixed(2)}
                                                                    </Text>
                                                                </View>

                                                                {user.id !== 'me' && (
                                                                    <TouchableOpacity
                                                                        onPress={(e) => { e.stopPropagation(); sendRequest(user, totals.total); }}
                                                                        className={`items-center justify-center py-2 px-3 rounded-xl ml-3 border ${sentUsers[user.id] ? 'bg-green-700/10 border-green-700/30' : (isDark ? 'bg-white/5 border-white/10' : 'bg-primary/5 border-primary/20')} active:scale-95`}
                                                                        style={{ minWidth: 64 }}
                                                                    >
                                                                        {sentUsers[user.id] ? (
                                                                            <Send size={16} color={isDark ? colors.success : '#15803d'} />
                                                                        ) : (
                                                                            <Send size={16} color={isDark ? 'white' : colors.primary} />
                                                                        )}
                                                                        <Text 
                                                                            className="font-body-bold uppercase tracking-wider"
                                                                            style={{ 
                                                                                fontSize: 9, 
                                                                                marginTop: 4,
                                                                                color: sentUsers[user.id] 
                                                                                    ? (isDark ? colors.success : '#15803d') 
                                                                                    : (isDark ? 'white' : colors.primary),
                                                                                opacity: sentUsers[user.id] ? 0.8 : 1
                                                                            }}
                                                                        >
                                                                            {sentUsers[user.id] ? 'RESEND' : 'REQUEST'}
                                                                        </Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                            </View>
                                                        </View>

                                                        <View className="mt-6 flex-row flex-wrap justify-between items-center pt-5 border-t" style={{ borderTopColor: colors.outlineVariant + (isDark ? '40' : '1A') }}>
                                                            <View className="flex-row items-center mb-2">
                                                                <Text className="text-[10px] font-body font-bold" style={{ color: colors.onSurface, opacity: isDark ? 0.6 : 0.4 }}>ITEMS </Text>
                                                                <Text className="text-sm font-body font-bold" style={{ color: colors.onSurface, opacity: isDark ? 0.8 : 0.6 }}>${totals.items.toFixed(2)}</Text>
                                                            </View>
                                                            <View className="flex-row items-center mb-2">
                                                                <Text className="text-[10px] font-body font-bold" style={{ color: colors.onSurface, opacity: isDark ? 0.6 : 0.4 }}>TAX </Text>
                                                                <Text className="text-sm font-body font-bold" style={{ color: colors.onSurface, opacity: isDark ? 0.8 : 0.6 }}>${totals.tax.toFixed(2)}</Text>
                                                            </View>
                                                            <View className="flex-row items-center mb-2">
                                                                <Text className="text-[10px] font-body font-bold" style={{ color: colors.onSurface, opacity: isDark ? 0.6 : 0.4 }}>EXTRA </Text>
                                                                <Text className="text-sm font-body font-bold" style={{ color: colors.onSurface, opacity: isDark ? 0.8 : 0.6 }}>${(totals.serviceCharge + totals.tip).toFixed(2)}</Text>
                                                            </View>
                                                            {totals.discount > 0 && (
                                                                <View className="flex-row items-center mb-2">
                                                                    <Text className="text-[10px] font-body font-bold" style={{ color: colors.onSurface, opacity: isDark ? 0.6 : 0.4 }}>DISC </Text>
                                                                    <Text className="text-green-700 text-sm font-body font-bold">-${totals.discount.toFixed(2)}</Text>
                                                                </View>
                                                            )}

                                                            {expandedUsers[user.id] ? <ChevronUp size={20} color="#a1a1aa" className="ml-2" /> : <ChevronDown size={20} color="#a1a1aa" className="ml-2" />}
                                                        </View>
                                                    </TouchableOpacity>

                                                    {expandedUsers[user.id] && (
                                                        <View className="px-6 pb-6 pt-2 bg-surface-container-lowest border-t" style={{ borderTopColor: colors.outlineVariant + (isDark ? '40' : '1A') }}>
                                                            {items.filter((i: BillItem) => (i.assignedTo || []).includes(user.id)).map((item: BillItem) => {
                                                                const assigned = item.assignedTo || [];
                                                                const userShares = assigned.filter(id => id === user.id).length;
                                                                const sharePrice = ((Number(item.price) || 0) / (assigned.length || 1)) * userShares;
                                                                return (
                                                                    <View key={item.id} className="flex-row justify-between items-center mb-3">
                                                                        <Text className="font-body text-base flex-1 pr-4" style={{ color: colors.onSurface, opacity: 0.8 }}>{userShares > 1 ? `${userShares}x ` : ''}{item.name}</Text>
                                                                        <Text className="font-body-bold text-base" style={{ color: colors.onSurface }}>${sharePrice.toFixed(2)}</Text>
                                                                    </View>
                                                                );
                                                            })}

                                                            <View className="h-[1px] bg-outline-variant/20 w-full my-3" />

                                                            <View className="flex-row justify-between items-center mb-2">
                                                                <Text className="text-on-surface/60 font-body text-sm flex-1">Taxes & Fees</Text>
                                                                <Text className="text-on-surface/80 font-body-bold text-sm">${(totals.tax + totals.serviceCharge + totals.tip).toFixed(2)}</Text>
                                                            </View>
                                                            {totals.discount > 0 && (
                                                                <View className="flex-row justify-between items-center mb-2">
                                                                    <Text className="text-on-surface/60 font-body text-sm flex-1">Discount</Text>
                                                                    <Text className="text-green-700 font-body-bold text-sm">-${totals.discount.toFixed(2)}</Text>
                                                                </View>
                                                            )}

                                                            <TouchableOpacity
                                                                className={`mt-4 ${sentUsers[user.id] ? 'bg-green-700/10' : (isDark ? 'bg-white/10' : 'bg-primary/10')} py-3 rounded-xl flex-row justify-center items-center active:scale-[0.98]`}
                                                                onPress={() => sendDetailedRequest(user, totals)}
                                                            >
                                                                {sentUsers[user.id] ? (
                                                                    <Check size={16} color="#15803d" />
                                                                ) : (
                                                                    <Send size={16} color={isDark ? 'white' : "#85341f"} />
                                                                )}
                                                                <Text className={`${sentUsers[user.id] ? 'text-green-700' : (isDark ? 'text-white' : 'text-primary')} font-body-bold ml-2`}>
                                                                    {sentUsers[user.id] ? 'Sent!' : 'Text Detailed Breakdown'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}
                                                </View>
                                            );
                                        })}
                                    </>
                                )}
                            </ScrollView>

                            {/* Footer Actions */}
                            <Animated.View
                                entering={FadeInDown}
                                style={{
                                    paddingBottom: Math.max(insets.bottom, 16),
                                    paddingTop: 16,
                                    paddingHorizontal: 24,
                                    backgroundColor: colors.background,
                                    borderTopWidth: 1,
                                    borderTopColor: 'rgba(219, 193, 186, 0.2)',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    gap: 12
                                }}
                            >
                                <TouchableOpacity
                                    disabled={!isReadyToFinish}
                                    onPress={async () => {
                                        const payableUsers = users.filter((u: User) => u.id !== 'me' && calculateUserTotal(u.id).total > 0);
                                        const totalAmount = Math.max(0, subtotal - (parseFloat(discountAmount) || 0) + (parseFloat(taxAmount) || 0) + (parseFloat(serviceChargeAmount) || 0) + (parseFloat(tipAmount) || 0));

                                        const historyUsers = users.map((u: User) => {
                                            const userTotals = calculateUserTotal(u.id);
                                            return {
                                                id: u.id,
                                                name: u.name,
                                                amount: userTotals.total,
                                                wasRequested: u.id !== 'me' && userTotals.total > 0,
                                                phoneNumber: u.phoneNumber
                                            };
                                        });

                                        await HistoryService.saveBillToHistory({
                                            restaurantName,
                                            totalAmount,
                                            subtotal,
                                            tax: parseFloat(taxAmount) || 0,
                                            tip: parseFloat(tipAmount) || 0,
                                            serviceCharge: parseFloat(serviceChargeAmount) || 0,
                                            discount: parseFloat(discountAmount) || 0,
                                            items: items,
                                            users: historyUsers
                                        });

                                        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
                                    }}
                                    className={`w-full h-16 rounded-3xl flex-row justify-center items-center shadow-lg ${isReadyToFinish ? 'bg-primary active:scale-[0.98]' : 'bg-primary/50'}`}
                                    style={{
                                        shadowColor: '#85341f',
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: isReadyToFinish ? 0.3 : 0,
                                        shadowRadius: 16,
                                        elevation: isReadyToFinish ? 8 : 0,
                                    }}
                                >
                                    <Check size={20} color={isReadyToFinish ? "white" : "rgba(255, 255, 255, 0.5)"} />
                                    <Text style={{ color: isReadyToFinish ? 'white' : 'rgba(255, 255, 255, 0.5)', fontSize: 18, fontWeight: '800', letterSpacing: 0.5, marginLeft: 8 }}>Finished</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        </View>
                    </View>
                </View>
            </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
    );
}
