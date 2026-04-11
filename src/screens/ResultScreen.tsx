import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Share, Alert, Platform, Pressable } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Share as ShareIcon, Home, Copy, Send, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillItem, User } from '../types';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import ReceiptViewer from '../components/ReceiptViewer';

// Use the loaded font names from App.tsx (expo-google-fonts)
const NEWSREADER_BOLD = 'Newsreader_700Bold';
const NEWSREADER_ITALIC_BOLD = 'Newsreader_700Bold_Italic';
const NEWSREADER_REGULAR = 'Newsreader_400Regular';

// High-end distinct palette helper
const getUserColor = (userId: string) => {
    if (userId === 'me') return { bg: '#ffffff', border: '#85341f' };
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
    const { items, users, tax: initialTax = 0, serviceCharge: initialServiceCharge = 0, tip: initialTip = 0, discount: initialDiscount = 0, imageUri, restaurantName } = route.params;
    const insets = useSafeAreaInsets();

    const subtotal = items.reduce((sum: number, item: BillItem) => sum + item.price, 0);

    const [taxAmount, setTaxAmount] = useState(initialTax.toFixed(2));
    const [serviceChargeAmount, setServiceChargeAmount] = useState(initialServiceCharge.toFixed(2));
    const [tipAmount, setTipAmount] = useState(initialTip.toFixed(2));
    const [discountAmount, setDiscountAmount] = useState(initialDiscount.toFixed(2));
    const [venmoUsername, setVenmoUsername] = useState('');
    const [paymentNote, setPaymentNote] = useState(restaurantName ? `Dinner at ${restaurantName}` : '');
    const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

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
        const itemTotal = items.reduce((total: number, item: BillItem) => {
            const userShares = item.assignedTo.filter(id => id === userId).length;
            if (userShares > 0) {
                return total + ((item.price / item.assignedTo.length) * userShares);
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

        return {
            items: itemTotal,
            tax,
            serviceCharge,
            tip,
            discount,
            total: Math.max(0, itemTotal + tax + serviceCharge + tip - discount)
        };
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
            summary += `\nPay via Venmo: https://venmo.com/${cleanUsername}`;
        }
        
        return summary;
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: generateSummary(),
            });
        } catch (error) {
            Alert.alert('Error', 'Could not share summary');
        }
    };

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(generateSummary());
        Alert.alert('Copied', 'Summary copied to clipboard!');
    };

    const sendRequest = async (user: User, amount: number) => {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const recipients = user.phoneNumber ? [user.phoneNumber] : [];
            const note = paymentNote.trim() || 'the bill';
            let message = `Hey, your share of ${note} is $${amount.toFixed(2)}.`;
            
            if (venmoUsername.trim()) {
                const cleanUsername = venmoUsername.trim().replace('@', '');
                message += ` You can venmo me here https://venmo.com/${cleanUsername}?txn=pay&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`;
            }
            
            await SMS.sendSMSAsync(recipients, message);
        } else {
            Alert.alert('Error', 'SMS is not available on this device');
        }
    };

    const sendDetailedRequest = async (user: User, totals: any) => {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const recipients = user.phoneNumber ? [user.phoneNumber] : [];
            const note = paymentNote.trim() || 'the bill';
            
            let message = `Hey, your share of ${note} is $${totals.total.toFixed(2)}.\n\nHere is your breakdown:\n`;
            
            const userItems = items.filter((i: BillItem) => i.assignedTo.includes(user.id));
            userItems.forEach((item: BillItem) => {
                const userShares = item.assignedTo.filter(id => id === user.id).length;
                const sharePrice = (item.price / item.assignedTo.length) * userShares;
                message += `- ${userShares > 1 ? `${userShares}x ` : ''}${item.name}: $${sharePrice.toFixed(2)}\n`;
            });
            
            message += `\nFees & Adjustments:\n`;
            message += `- Taxes & Fees: $${(totals.tax + totals.serviceCharge + totals.tip).toFixed(2)}\n`;
            if (totals.discount > 0) {
                message += `- Discount: -$${totals.discount.toFixed(2)}\n`;
            }
            
            if (venmoUsername.trim()) {
                const cleanUsername = venmoUsername.trim().replace('@', '');
                message += `\nYou can venmo me here https://venmo.com/${cleanUsername}?txn=pay&amount=${totals.total.toFixed(2)}&note=${encodeURIComponent(note)}`;
            }
            
            await SMS.sendSMSAsync(recipients, message);
        } else {
            Alert.alert('Error', 'SMS is not available on this device');
        }
    };

    return (
        <NavigationContext.Provider value={navigation}>
            <NavigationRouteContext.Provider value={route}>
                <View style={{ flex: 1, backgroundColor: '#fcf9f4' }}>
                    <View style={{ flex: 1 }}>
                        <StatusBar style="dark" />
                        <View style={{ paddingTop: insets.top, flex: 1 }}>
                            {/* Header */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#fcf9f4', zIndex: 10, width: '100%' }}>
                                <TouchableOpacity 
                                    onPress={() => navigation.goBack()} 
                                    className="w-11 h-11 items-center justify-center rounded-full active:scale-95 bg-white shadow-sm border border-outline-variant/30"
                                    activeOpacity={0.7}
                                >
                                    <ArrowLeft size={24} color="#85341f" />
                                </TouchableOpacity>
                                <Text className="italic font-bold text-primary font-headline-italic" style={{ fontSize: 22 }}>Final Tally</Text>
                                <View className="flex-row items-center">
                                    <ReceiptViewer imageUri={imageUri} />
                                </View>
                            </View>

                            <ScrollView className="flex-1 px-6 mt-4" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                                {/* Global Settings & Payment */}
                                <View className="bg-white rounded-3xl p-6 mb-8 border border-outline-variant/20 shadow-sm">
                                    <Text className="text-primary text-xl font-headline mb-5">Adjustments & Payment</Text>
                                    
                                    <View className="space-y-4">
                                        {/* Adjustment Row: Discount */}
                                        <View className="flex-row justify-between items-center mb-3">
                                            <View className="flex-1">
                                                <Text className="text-on-surface/60 font-body font-bold text-base">Discount</Text>
                                                <Text className="text-primary/50 text-xs font-body">{subtotal > 0 ? ((parseFloat(discountAmount) || 0) / subtotal * 100).toFixed(2) : 0}%</Text>
                                            </View>
                                            <View className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1 w-24 flex-row items-center">
                                                <Text className="text-green-700 font-body-bold text-base mr-0.5" style={{ transform: [{ translateY: 2.5 }] }}>-</Text>
                                                <Text className="text-primary/40 font-body-bold text-base mr-1" style={{ transform: [{ translateY: 2.5 }] }}>$</Text>
                                                <TextInput
                                                    value={discountAmount}
                                                    onChangeText={setDiscountAmount}
                                                    keyboardType="decimal-pad"
                                                    className="text-on-surface text-right font-body-bold text-base flex-1 text-green-700"
                                                    style={{ padding: 0, height: 32, transform: [{ translateY: -2.0 }] }}
                                                />
                                            </View>
                                        </View>

                                        {/* Adjustment Row: Taxes */}
                                        <View className="flex-row justify-between items-center mb-3">
                                            <View className="flex-1">
                                                <Text className="text-on-surface/60 font-body font-bold text-base">Taxes & Fees</Text>
                                                <Text className="text-primary/50 text-xs font-body">{subtotal > 0 ? ((parseFloat(taxAmount) || 0) / subtotal * 100).toFixed(2) : 0}%</Text>
                                            </View>
                                            <View className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1 w-24 flex-row items-center">
                                                <Text className="text-primary/40 font-body-bold text-base mr-1" style={{ transform: [{ translateY: 2.5 }] }}>$</Text>
                                                <TextInput
                                                    value={taxAmount}
                                                    onChangeText={setTaxAmount}
                                                    keyboardType="decimal-pad"
                                                    className="text-on-surface text-right font-body-bold text-base flex-1"
                                                    style={{ padding: 0, height: 32, transform: [{ translateY: -2.0 }] }}
                                                />
                                            </View>
                                        </View>

                                        {/* Adjustment Row: Service Charge */}
                                        <View className="flex-row justify-between items-center mb-3">
                                            <View className="flex-1">
                                                <Text className="text-on-surface/60 font-body font-bold text-base">Service Charge</Text>
                                                <Text className="text-primary/50 text-xs font-body">{subtotal > 0 ? ((parseFloat(serviceChargeAmount) || 0) / subtotal * 100).toFixed(2) : 0}%</Text>
                                            </View>
                                            <View className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1 w-24 flex-row items-center">
                                                <Text className="text-primary/40 font-body-bold text-base mr-1" style={{ transform: [{ translateY: 2.5 }] }}>$</Text>
                                                <TextInput
                                                    value={serviceChargeAmount}
                                                    onChangeText={setServiceChargeAmount}
                                                    keyboardType="decimal-pad"
                                                    className="text-on-surface text-right font-body-bold text-base flex-1"
                                                    style={{ padding: 0, height: 32, transform: [{ translateY: -2.0 }] }}
                                                />
                                            </View>
                                        </View>

                                        {/* Adjustment Row: Tip */}
                                        <View className="flex-row justify-between items-center mb-6">
                                            <View className="flex-1">
                                                <Text className="text-on-surface/60 font-body font-bold text-base">Tip</Text>
                                                <Text className="text-primary/50 text-xs font-body">{subtotal > 0 ? ((parseFloat(tipAmount) || 0) / subtotal * 100).toFixed(2) : 0}%</Text>
                                            </View>
                                            <View className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1 w-24 flex-row items-center">
                                                <Text className="text-primary/40 font-body-bold text-base mr-1" style={{ transform: [{ translateY: 2.5 }] }}>$</Text>
                                                <TextInput
                                                    value={tipAmount}
                                                    onChangeText={setTipAmount}
                                                    keyboardType="decimal-pad"
                                                    className="text-on-surface text-right font-body-bold text-base flex-1"
                                                    style={{ padding: 0, height: 32, transform: [{ translateY: -2.0 }] }}
                                                />
                                            </View>
                                        </View>

                                        <View className="h-[1px] bg-outline-variant/30 w-full my-1" />

                                        {/* Venmo Row */}
                                        <View className="flex-row items-center mt-4">
                                            <Text className="text-on-surface/60 font-body font-bold text-base w-24">Venmo</Text>
                                            <View className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1 flex-1 flex-row items-center">
                                                <Text className="text-primary/40 font-body-bold text-base mr-1" style={{ transform: [{ translateY: 3.5 }] }}>@</Text>
                                                <TextInput
                                                    value={venmoUsername}
                                                    onChangeText={saveVenmoUsername}
                                                    placeholder="yourusername"
                                                    placeholderTextColor="#a1a1aa"
                                                    className="text-on-surface font-body-bold text-base flex-1"
                                                    autoCapitalize="none"
                                                    autoCorrect={false}
                                                    style={{ padding: 0, height: 32, transform: [{ translateY: -2.0 }] }}
                                                />
                                            </View>
                                        </View>

                                        {/* Description Row */}
                                        <View className="flex-row items-center mt-4">
                                            <Text className="text-on-surface/60 font-body font-bold text-base w-24">Description</Text>
                                            <View className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-1 flex-1 flex-row items-center">
                                                <TextInput
                                                    value={paymentNote}
                                                    onChangeText={setPaymentNote}
                                                    placeholder="Dinner at Saganaki..."
                                                    placeholderTextColor="#a1a1aa"
                                                    className="text-on-surface font-body-bold text-base flex-1"
                                                    style={{ padding: 0, height: 32, transform: [{ translateY: -2.0 }] }}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {/* Breakdown per User */}
                                <Text className="text-primary text-xl font-headline mb-4 px-2 tracking-wide">Individual Breakdown</Text>

                                {users.map((user: User, index: number) => {
                                    const totals = calculateUserTotal(user.id);
                                    if (user.id !== 'me' && totals.total === 0) return null;

                                    return (
                                        <View key={user.id} className="bg-white rounded-3xl mb-5 border border-outline-variant/20 shadow-sm overflow-hidden">
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
                                                                    <Text style={{ fontWeight: '700', fontSize: 18, color: '#85341f' }}>{user.initials}</Text>
                                                                </View>
                                                            );
                                                        })()}
                                                        <Text className="text-on-surface font-body-bold text-xl flex-1" numberOfLines={1}>{user.name}</Text>
                                                    </View>
                                                    <View className="flex-row items-center">
                                                        <View className="flex-row items-baseline">
                                                            <Text className="text-primary/60 font-body font-bold text-lg mr-0.5">$</Text>
                                                            <Text className="text-primary text-2xl font-body font-bold">
                                                                {totals.total.toFixed(2)}
                                                            </Text>
                                                        </View>
                                                        
                                                        {user.id !== 'me' && (
                                                            <TouchableOpacity
                                                                onPress={(e) => { e.stopPropagation(); sendRequest(user, totals.total); }}
                                                                className="bg-primary/10 w-9 h-9 rounded-full items-center justify-center active:scale-95 ml-3"
                                                            >
                                                                <Send size={15} color="#85341f" style={{ transform: [{ translateX: -1 }, { translateY: 1 }] }} />
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>

                                                <View className="mt-6 flex-row flex-wrap justify-between items-center pt-5 border-t border-outline-variant/10">
                                                    <View className="flex-row items-center mb-2">
                                                        <Text className="text-on-surface/40 text-[10px] font-body font-bold">ITEMS </Text>
                                                        <Text className="text-on-surface/60 text-sm font-body font-bold">${totals.items.toFixed(2)}</Text>
                                                    </View>
                                                    <View className="flex-row items-center mb-2">
                                                        <Text className="text-on-surface/40 text-[10px] font-body font-bold">TAX </Text>
                                                        <Text className="text-on-surface/60 text-sm font-body font-bold">${totals.tax.toFixed(2)}</Text>
                                                    </View>
                                                    <View className="flex-row items-center mb-2">
                                                        <Text className="text-on-surface/40 text-[10px] font-body font-bold">EXTRA </Text>
                                                        <Text className="text-on-surface/60 text-sm font-body font-bold">${(totals.serviceCharge + totals.tip).toFixed(2)}</Text>
                                                    </View>
                                                    {totals.discount > 0 && (
                                                        <View className="flex-row items-center mb-2">
                                                            <Text className="text-on-surface/40 text-[10px] font-body font-bold">DISC </Text>
                                                            <Text className="text-green-700 text-sm font-body font-bold">-${totals.discount.toFixed(2)}</Text>
                                                        </View>
                                                    )}
                                                    
                                                    {expandedUsers[user.id] ? <ChevronUp size={20} color="#a1a1aa" className="ml-2" /> : <ChevronDown size={20} color="#a1a1aa" className="ml-2" />}
                                                </View>
                                            </TouchableOpacity>

                                            {expandedUsers[user.id] && (
                                                <View className="px-6 pb-6 pt-2 bg-surface-container-lowest border-t border-outline-variant/10">
                                                    {items.filter((i: BillItem) => i.assignedTo.includes(user.id)).map((item: BillItem) => {
                                                        const userShares = item.assignedTo.filter(id => id === user.id).length;
                                                        const sharePrice = (item.price / item.assignedTo.length) * userShares;
                                                        return (
                                                            <View key={item.id} className="flex-row justify-between items-center mb-3">
                                                                <Text className="text-on-surface/80 font-body text-base flex-1 pr-4">{userShares > 1 ? `${userShares}x ` : ''}{item.name}</Text>
                                                                <Text className="text-on-surface font-body-bold text-base">${sharePrice.toFixed(2)}</Text>
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
                                                        className="mt-4 bg-primary/10 py-3 rounded-xl flex-row justify-center items-center active:scale-[0.98]"
                                                        onPress={() => sendDetailedRequest(user, totals)}
                                                    >
                                                        <Send size={16} color="#85341f" />
                                                        <Text className="text-primary font-body-bold ml-2">Text Detailed Breakdown</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </ScrollView>

                            {/* Footer Actions */}
                            <View
                                style={{
                                    paddingBottom: Math.max(insets.bottom, 16),
                                    paddingTop: 16,
                                    paddingHorizontal: 24,
                                    backgroundColor: '#fcf9f4',
                                    borderTopWidth: 1,
                                    borderTopColor: 'rgba(219, 193, 186, 0.2)',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    gap: 12
                                }}
                            >
                                <TouchableOpacity
                                    onPress={copyToClipboard}
                                    className="flex-1 bg-white border border-outline-variant/50 h-16 rounded-3xl flex-row justify-center items-center shadow-sm active:scale-[0.98]"
                                >
                                    <Copy size={20} color="#85341f" />
                                    <Text className="text-primary font-body-bold text-base ml-2">Copy Text</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleShare}
                                    className="flex-1 bg-primary h-16 rounded-3xl flex-row justify-center items-center shadow-lg active:scale-[0.98]"
                                    style={{
                                        shadowColor: '#85341f',
                                        shadowOffset: { width: 0, height: 8 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 16,
                                        elevation: 8,
                                    }}
                                >
                                    <ShareIcon size={20} color="white" />
                                    <Text className="text-white font-body-bold text-base ml-2">Share Summary</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
    );
}
