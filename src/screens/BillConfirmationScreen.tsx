import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Edit2, X } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { mockProcessBill } from '../services/ocrService';
import { BillItem } from '../types';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import ReceiptViewer from '../components/ReceiptViewer';

// Use the loaded font names from App.tsx (expo-google-fonts)
const NEWSREADER_BOLD = 'Newsreader_700Bold';
const NEWSREADER_ITALIC_BOLD = 'Newsreader_700Bold_Italic';
const NEWSREADER_REGULAR = 'Newsreader_400Regular';

export default function BillConfirmationScreen({ navigation, route }: any) {
    const { imageUri } = route.params;
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<BillItem[]>([]);
    const [tax, setTax] = useState(0);
    const [serviceCharge, setServiceCharge] = useState(0);
    const [tip, setTip] = useState(0);

    useEffect(() => {
        processBill();
    }, []);

    const processBill = async () => {
        try {
            const rawData = await mockProcessBill(imageUri);

            if (rawData.tax) setTax(rawData.tax);
            if (rawData.serviceCharge) setServiceCharge(rawData.serviceCharge);
            if (rawData.tip) setTip(rawData.tip);

            const processedItems: BillItem[] = [];

            rawData.items.forEach(item => {
                const match = item.name.match(/^(\d+)\s+(.*)/);

                if (match) {
                    const quantity = parseInt(match[1]);
                    const baseName = toTitleCase(match[2]);

                    if (quantity > 1) {
                        const parentItem: BillItem = {
                            ...item,
                            name: `${quantity} ${baseName}`,
                            isGroup: true,
                            id: `${item.id}_group`,
                            assignedTo: []
                        };
                        processedItems.push(parentItem);

                        const newPrice = item.price / quantity;
                        for (let i = 0; i < quantity; i++) {
                            processedItems.push({
                                id: `${item.id}_split_${i}`,
                                name: `${baseName} (${i + 1}/${quantity})`,
                                price: newPrice,
                                assignedTo: [],
                            });
                        }
                    } else {
                        processedItems.push({ ...item, name: `${quantity} ${baseName}` });
                    }
                } else {
                    processedItems.push({ ...item, name: toTitleCase(item.name) });
                }
            });

            setItems(processedItems);
        } catch (error: any) {
            console.error("OCR Error:", error);
            Alert.alert(
                "Error processing receipt",
                error.message || "Failed to analyze the receipt. Please try again or enter details manually.",
                [{ text: "OK" }]
            );
        } finally {
            setLoading(false);
        }
    };

    const toTitleCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        }).join(' ');
    };

    const updateItem = (id: string, field: 'name' | 'price', value: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                if (field === 'price') {
                    const numValue = parseFloat(value);
                    return { ...item, price: isNaN(numValue) ? 0 : numValue };
                }
                return { ...item, name: value };
            }
            return item;
        }));
    };

    const subtotal = items.filter(i => !i.isGroup).reduce((sum, item) => sum + item.price, 0);

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
                    <Text className="italic font-bold text-primary font-headline-italic" style={{ fontSize: 22 }}>Review Bill</Text>
                    <View style={{ width: 44 }} className="items-end justify-center">
                        <ReceiptViewer imageUri={imageUri} />
                    </View>
                </View>

                {loading ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#85341f" />
                        <Text className="text-primary mt-6 font-headline text-2xl">Scanning Receipt...</Text>
                    </View>
                ) : (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                    >
                        <View className="flex-1 p-6">
                            <View className="flex-1 bg-white rounded-3xl shadow-xl border border-outline-variant/20 overflow-hidden">
                                <View className="pt-6 pb-2 items-center">
                                    <Text className="font-body-bold text-[10px] uppercase tracking-[0.2em] text-on-surface/40">Tap items to edit</Text>
                                </View>

                                <ScrollView 
                                    className="flex-1 px-5" 
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {items.map((item, index) => (
                                        <View
                                            key={item.id}
                                            className={`flex-row justify-between items-center py-4 border-b border-outline-variant/10 ${index === items.length - 1 ? 'border-b-0' : ''}`}
                                        >
                                            <View className="flex-1 mr-4">
                                                <TextInput
                                                    value={item.name}
                                                    onChangeText={(text) => updateItem(item.id, 'name', text)}
                                                    className={`text-on-surface text-lg ${item.isGroup ? 'opacity-40 italic' : ''}`}
                                                    style={{ fontFamily: NEWSREADER_BOLD, paddingVertical: 4 }}
                                                    multiline={true}
                                                    blurOnSubmit={true}
                                                />
                                            </View>
                                            <View className="flex-row items-center bg-white rounded-xl px-2 h-9 border border-outline-variant/20 shadow-sm">
                                                <Text className="text-primary/60 mr-1 font-body font-bold" style={{ fontSize: 14, transform: [{ translateY: 1.5 }] }}>$</Text>
                                                <TextInput
                                                    value={item.price.toString()}
                                                    onChangeText={(text) => updateItem(item.id, 'price', text)}
                                                    keyboardType="numeric"
                                                    className="text-on-surface text-base w-12 text-right font-body font-bold"
                                                    style={{ padding: 0, transform: [{ translateY: -2.0 }] }}
                                                />
                                            </View>
                                        </View>
                                    ))}

                                    {/* Totals Section */}
                                    <View className="bg-primary/[0.03] p-6 mt-8 rounded-3xl border border-outline-variant/40">
                                        <View className="flex-row justify-between items-center mb-6">
                                            <Text className="text-on-surface/60 text-lg font-body font-bold">Subtotal</Text>
                                            <View className="flex-row items-baseline">
                                                <Text className="text-primary/60 font-body font-bold text-3xl mr-1">$</Text>
                                                <Text className="text-on-surface text-3xl font-body font-bold">
                                                    {subtotal.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="space-y-4">
                                            <View className="flex-row justify-between items-center mb-4">
                                                <Text className="text-on-surface/60 text-base font-body font-bold">Taxes & Fees</Text>
                                                <View className="flex-row items-center bg-white rounded-xl px-2 h-9 border border-outline-variant/20 shadow-sm">
                                                    <Text className="text-primary/40 mr-1 font-body font-bold" style={{ fontSize: 14, transform: [{ translateY: 1.5 }] }}>$</Text>
                                                    <TextInput
                                                        value={tax.toString()}
                                                        onChangeText={(text) => setTax(parseFloat(text) || 0)}
                                                        keyboardType="numeric"
                                                        className="text-on-surface text-base w-14 text-right font-body font-bold"
                                                        style={{ padding: 0, transform: [{ translateY: -2.0 }] }}
                                                    />
                                                </View>
                                            </View>

                                            <View className="flex-row justify-between items-center mb-4">
                                                <Text className="text-on-surface/60 text-base font-body font-bold">Service Charge</Text>
                                                <View className="flex-row items-center bg-white rounded-xl px-2 h-9 border border-outline-variant/20 shadow-sm">
                                                    <Text className="text-primary/40 mr-1 font-body font-bold" style={{ fontSize: 14, transform: [{ translateY: 1.5 }] }}>$</Text>
                                                    <TextInput
                                                        value={serviceCharge.toString()}
                                                        onChangeText={(text) => setServiceCharge(parseFloat(text) || 0)}
                                                        keyboardType="numeric"
                                                        className="text-on-surface text-base w-14 text-right font-body font-bold"
                                                        style={{ padding: 0, transform: [{ translateY: -2.0 }] }}
                                                    />
                                                </View>
                                            </View>

                                            <View className="flex-row justify-between items-center">
                                                <Text className="text-on-surface/60 text-base font-body font-bold">Expected Tip</Text>
                                                <View className="flex-row items-center bg-white rounded-xl px-2 h-9 border border-outline-variant/20 shadow-sm">
                                                    <Text className="text-primary/40 mr-1 font-body font-bold" style={{ fontSize: 14, transform: [{ translateY: 1.5 }] }}>$</Text>
                                                    <TextInput
                                                        value={tip.toString()}
                                                        onChangeText={(text) => setTip(parseFloat(text) || 0)}
                                                        keyboardType="numeric"
                                                        className="text-on-surface text-base w-14 text-right font-body font-bold"
                                                        style={{ padding: 0, transform: [{ translateY: -2.0 }] }}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>

                        {/* Bottom Action */}
                        <View className="px-6 pb-10 pt-2">
                            <TouchableOpacity
                                className="bg-primary py-5 rounded-3xl flex-row justify-center items-center shadow-lg active:scale-95"
                                onPress={() => navigation.navigate('Splitting', { items, tax, serviceCharge, tip, imageUri })}
                                activeOpacity={0.9}
                            >
                                <Text className="text-white text-xl font-headline mr-3">Start Splitting</Text>
                                <Check size={22} color="white" strokeWidth={3} />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                )}
                        </View>
                    </View>
                </View>
            </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
    );
}
