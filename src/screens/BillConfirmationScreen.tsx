import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Check, Edit2 } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { mockProcessBill } from '../services/ocrService';
import { BillItem } from '../types';
import ReceiptViewer from '../components/ReceiptViewer';

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

            // Set Tax, Service Charge, and Tip
            if (rawData.tax) setTax(rawData.tax);
            if (rawData.serviceCharge) setServiceCharge(rawData.serviceCharge);
            if (rawData.tip) setTip(rawData.tip);

            // Auto-split based on quantity
            const processedItems: BillItem[] = [];

            rawData.items.forEach(item => {
                const match = item.name.match(/^(\d+)\s+(.*)/);

                if (match) {
                    const quantity = parseInt(match[1]);
                    const baseName = match[2];

                    if (quantity > 1) {
                        // Create Parent Group Item
                        const parentItem: BillItem = {
                            ...item,
                            isGroup: true,
                            id: `${item.id}_group`,
                            assignedTo: []
                        };
                        processedItems.push(parentItem);

                        // Create Children
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
                        processedItems.push(item);
                    }
                } else {
                    processedItems.push(item);
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

    const updateItem = (id: string, field: 'name' | 'price', value: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === id) {
                if (field === 'price') {
                    // Only allow numeric input
                    const numValue = parseFloat(value);
                    return { ...item, price: isNaN(numValue) ? 0 : numValue };
                }
                return { ...item, name: value };
            }
            return item;
        }));
    };

    return (
        <View className="flex-1 bg-black">
            <Image source={{ uri: imageUri }} className="absolute w-full h-full opacity-50" resizeMode="cover" />
            <BlurView intensity={80} tint="dark" className="flex-1">
                <View style={{ paddingTop: insets.top }} className="flex-1">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 z-10">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-white/10 rounded-full">
                            <ArrowLeft size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white text-xl font-bold">Review Bill</Text>
                        <View className="w-10" />
                    </View>

                    {/* Persistent Receipt Viewer */}
                    {!loading && <ReceiptViewer imageUri={imageUri} />}

                    {/* Content */}
                    {loading ? (
                        <View className="flex-1 justify-center items-center">
                            <ActivityIndicator size="large" color="white" />
                            <Text className="text-white mt-4 font-medium">Scanning Receipt...</Text>
                        </View>
                    ) : (
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}
                        >
                            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                                <View className="bg-white/10 rounded-3xl p-6 mb-32 overflow-hidden border border-white/10 mt-4">
                                    <Text className="text-gray-400 text-xs mb-4 text-center uppercase tracking-widest">Tap items to edit</Text>

                                    {items.map((item, index) => (
                                        <Animated.View
                                            entering={FadeInDown.delay(index * 100).duration(400)}
                                            key={item.id}
                                            style={[
                                                { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, alignItems: 'center' },
                                                index !== items.length - 1 ? { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' } : {},
                                                item.parentId ? { paddingLeft: 32 } : {}
                                            ]}
                                        >
                                            <View className="flex-1 mr-4">
                                                <TextInput
                                                    value={item.name}
                                                    onChangeText={(text) => updateItem(item.id, 'name', text)}
                                                    className={`text-white text-lg ${item.isGroup ? 'font-bold opacity-60' : ''}`}
                                                    multiline
                                                />
                                            </View>
                                            <View className="flex-row items-center bg-black/20 rounded-lg px-2 py-1">
                                                <Text className="text-gray-400 mr-1">$</Text>
                                                <TextInput
                                                    value={item.price.toString()}
                                                    onChangeText={(text) => updateItem(item.id, 'price', text)}
                                                    keyboardType="numeric"
                                                    className={`text-white text-lg font-mono font-bold ${item.isGroup ? 'opacity-60' : ''}`}
                                                    style={{ minWidth: 60, textAlign: 'right' }}
                                                />
                                            </View>
                                        </Animated.View>
                                    ))}

                                    <View className="mt-8 pt-4 border-t border-white/20">
                                        <View className="flex-row justify-between mb-2">
                                            <Text className="text-gray-300 text-lg">Subtotal</Text>
                                            <Text className="text-white text-xl font-bold">
                                                ${items.filter(i => !i.isGroup).reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                                            </Text>
                                        </View>

                                        <View className="flex-row justify-between mb-2 items-center">
                                            <Text className="text-gray-300 text-sm">Taxes and Fees</Text>
                                            <View className="flex-row items-center bg-black/20 rounded-lg px-2 py-1">
                                                <Text className="text-gray-400 mr-1">$</Text>
                                                <TextInput
                                                    value={tax.toString()}
                                                    onChangeText={(text) => setTax(parseFloat(text) || 0)}
                                                    keyboardType="numeric"
                                                    className="text-white text-sm font-bold min-w-[50px] text-right"
                                                />
                                            </View>
                                        </View>

                                        <View className="flex-row justify-between mb-2 items-center">
                                            <Text className="text-gray-300 text-sm">Service Charge</Text>
                                            <View className="flex-row items-center bg-black/20 rounded-lg px-2 py-1">
                                                <Text className="text-gray-400 mr-1">$</Text>
                                                <TextInput
                                                    value={serviceCharge.toString()}
                                                    onChangeText={(text) => setServiceCharge(parseFloat(text) || 0)}
                                                    keyboardType="numeric"
                                                    className="text-white text-sm font-bold min-w-[50px] text-right"
                                                />
                                            </View>
                                        </View>

                                        <View className="flex-row justify-between items-center">
                                            <Text className="text-gray-300 text-sm">Tip</Text>
                                            <View className="flex-row items-center bg-black/20 rounded-lg px-2 py-1">
                                                <Text className="text-gray-400 mr-1">$</Text>
                                                <TextInput
                                                    value={tip.toString()}
                                                    onChangeText={(text) => setTip(parseFloat(text) || 0)}
                                                    keyboardType="numeric"
                                                    className="text-white text-sm font-bold min-w-[50px] text-right"
                                                />
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    )}

                    {/* Bottom Action */}
                    {!loading && (
                        <Animated.View
                            entering={FadeIn.delay(500)}
                            style={{ paddingBottom: insets.bottom + 20, position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 24 }}
                        >
                            <TouchableOpacity
                                className="bg-blue-600 p-4 rounded-2xl flex-row justify-center items-center shadow-lg shadow-blue-500/30"
                                onPress={() => navigation.navigate('Splitting', { items, tax, serviceCharge, tip, imageUri })}
                            >
                                <Text className="text-white text-lg font-bold mr-2">Start Splitting</Text>
                                <Check size={20} color="white" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                </View>
            </BlurView>
        </View>
    );
}
