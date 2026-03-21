import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Share, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Share as ShareIcon, Home, Copy, Send } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import * as SMS from 'expo-sms';
import { BillItem, User } from '../types';
import ReceiptViewer from '../components/ReceiptViewer';

export default function ResultScreen({ navigation, route }: any) {
    const { items, users, tax: initialTax, serviceCharge: initialServiceCharge, tip: initialTip, imageUri } = route.params;
    const insets = useSafeAreaInsets();

    // Initialize with detected values or 0
    const subtotal = items.reduce((sum: number, item: BillItem) => sum + item.price, 0);

    // Calculate initial rates if amounts are provided
    // If we have amounts, calculate percentage. If not, default to 8.875% tax and 18% tip.
    const initialTaxRate = initialTax ? (initialTax / subtotal) * 100 : 8.875;
    const initialServiceChargeRate = initialServiceCharge ? (initialServiceCharge / subtotal) * 100 : 0;
    const initialTipRate = initialTip ? (initialTip / subtotal) * 100 : 18;

    const [taxRate, setTaxRate] = useState(initialTaxRate.toFixed(2));
    const [serviceChargeRate, setServiceChargeRate] = useState(initialServiceChargeRate.toFixed(2));
    const [tipRate, setTipRate] = useState(initialTipRate.toFixed(2));

    const calculateUserTotal = (userId: string) => {
        const itemTotal = items.reduce((total: number, item: BillItem) => {
            const userShares = item.assignedTo.filter(id => id === userId).length;
            if (userShares > 0) {
                return total + ((item.price / item.assignedTo.length) * userShares);
            }
            return total;
        }, 0);

        const currentTaxRate = parseFloat(taxRate) || 0;
        const currentServiceChargeRate = parseFloat(serviceChargeRate) || 0;
        const currentTipRate = parseFloat(tipRate) || 0;

        const tax = itemTotal * (currentTaxRate / 100);
        const serviceCharge = itemTotal * (currentServiceChargeRate / 100);
        const tip = itemTotal * (currentTipRate / 100);

        return {
            items: itemTotal,
            tax,
            serviceCharge,
            tip,
            total: itemTotal + tax + serviceCharge + tip
        };
    };

    const generateSummary = () => {
        let summary = "🧾 Bill Split Summary\n\n";
        users.forEach((user: User) => {
            if (user.id === 'me') return;
            const { total } = calculateUserTotal(user.id);
            if (total > 0) {
                summary += `${user.name}: $${total.toFixed(2)}\n`;
            }
        });
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
            await SMS.sendSMSAsync(
                recipients,
                `Hey ${user.name}, your share of the bill is $${amount.toFixed(2)}.`
            );
        } else {
            Alert.alert('Error', 'SMS is not available on this device');
        }
    };

    return (
        <View className="flex-1 bg-black">
            <BlurView intensity={80} tint="dark" className="flex-1">
                <View style={{ paddingTop: insets.top, paddingBottom: insets.bottom }} className="flex-1">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-4 py-4 border-b border-white/10 z-10">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-white/10 rounded-full">
                            <ArrowLeft size={24} color="white" />
                        </TouchableOpacity>
                        <Text className="text-white text-xl font-bold">Final Tally</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Home')} className="p-2 bg-white/10 rounded-full">
                            <Home size={24} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Receipt Viewer */}
                    <ReceiptViewer imageUri={imageUri} />

                    <ScrollView className="flex-1 px-4 mt-4">
                        {/* Global Settings */}
                        <View className="bg-white/10 rounded-3xl p-6 mb-6 border border-white/10">
                            <Text className="text-white text-lg font-bold mb-4">Adjustments</Text>

                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-gray-300">Taxes and Fees (%)</Text>
                                <View className="bg-black/40 rounded-xl px-4 py-2 w-24">
                                    <TextInput
                                        value={taxRate}
                                        onChangeText={setTaxRate}
                                        keyboardType="numeric"
                                        className="text-white text-right font-bold"
                                    />
                                </View>
                            </View>

                            <View className="flex-row justify-between items-center mb-4">
                                <Text className="text-gray-300">Service Charge (%)</Text>
                                <View className="bg-black/40 rounded-xl px-4 py-2 w-24">
                                    <TextInput
                                        value={serviceChargeRate}
                                        onChangeText={setServiceChargeRate}
                                        keyboardType="numeric"
                                        className="text-white text-right font-bold"
                                    />
                                </View>
                            </View>

                            <View className="flex-row justify-between items-center">
                                <Text className="text-gray-300">Tip Rate (%)</Text>
                                <View className="bg-black/40 rounded-xl px-4 py-2 w-24">
                                    <TextInput
                                        value={tipRate}
                                        onChangeText={setTipRate}
                                        keyboardType="numeric"
                                        className="text-white text-right font-bold"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Breakdown per User */}
                        <Text className="text-white text-lg font-bold mb-4 px-2">Breakdown</Text>

                        {users.map((user: User, index: number) => {
                            const totals = calculateUserTotal(user.id);
                            if (user.id !== 'me' && totals.total === 0) return null;

                            return (
                                <Animated.View
                                    key={user.id}
                                    entering={FadeInDown.delay(index * 100)}
                                    className="bg-gray-800/60 rounded-2xl p-4 mb-4 border border-white/5"
                                >
                                    <View className="flex-row justify-between items-center mb-2">
                                        <View className="flex-row items-center">
                                            <View className="w-8 h-8 rounded-full bg-gray-600 justify-center items-center mr-3">
                                                <Text className="text-white text-xs font-bold">{user.initials}</Text>
                                            </View>
                                            <Text className="text-white font-bold text-lg">{user.name}</Text>
                                        </View>
                                        <View className="flex-row items-center">
                                            <Text className="text-green-400 text-xl font-bold mr-3">${totals.total.toFixed(2)}</Text>
                                            {user.id !== 'me' && (
                                                <TouchableOpacity
                                                    onPress={() => sendRequest(user, totals.total)}
                                                    className="p-2 bg-blue-600 rounded-full"
                                                >
                                                    <Send size={16} color="white" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    <View className="flex-row justify-between mt-2 pt-2 border-t border-white/10">
                                        <Text className="text-gray-400 text-xs shadow-none">Items: ${totals.items.toFixed(2)}</Text>
                                        <Text className="text-gray-400 text-xs shadow-none">Tax: ${totals.tax.toFixed(2)}</Text>
                                        <Text className="text-gray-400 text-xs shadow-none">Service: ${totals.serviceCharge.toFixed(2)}</Text>
                                        <Text className="text-gray-400 text-xs shadow-none">Tip: ${totals.tip.toFixed(2)}</Text>
                                    </View>
                                </Animated.View>
                            );
                        })}
                        <View className="h-20" />
                    </ScrollView>

                    {/* Footer Actions */}
                    <Animated.View
                        entering={FadeIn.delay(500)}
                        className="flex-row justify-between px-4 pb-8 pt-4 border-t border-white/10 bg-black/80"
                        style={{ paddingBottom: insets.bottom + 10 }}
                    >
                        <TouchableOpacity
                            onPress={copyToClipboard}
                            className="flex-1 bg-gray-700 p-4 rounded-2xl flex-row justify-center items-center mr-2"
                        >
                            <Copy size={20} color="white" />
                            <Text className="text-white font-bold ml-2">Copy</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleShare}
                            className="flex-1 bg-blue-600 p-4 rounded-2xl flex-row justify-center items-center ml-2"
                        >
                            <ShareIcon size={20} color="white" />
                            <Text className="text-white font-bold ml-2">Share</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </BlurView>
        </View>
    );
}
