import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, Alert, Pressable } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Edit2, X, CornerDownRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { mockProcessBill } from '../services/ocrService';
import { BillItem } from '../types';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import ReceiptViewer from '../components/ReceiptViewer';
import { useTheme } from '../ThemeContext';
import { OutlinedText } from '../components/OutlinedText';

// Use the loaded font names from App.tsx (expo-google-fonts)
const NEWSREADER_BOLD = 'Newsreader_700Bold';
const NEWSREADER_ITALIC_BOLD = 'Newsreader_700Bold_Italic';
const NEWSREADER_REGULAR = 'Newsreader_400Regular';

export default function BillConfirmationScreen({ navigation, route }: any) {
    const { imageUri } = route.params;
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<BillItem[]>([]);
    const [tax, setTax] = useState(0);
    const [serviceCharge, setServiceCharge] = useState(0);
    const [tip, setTip] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [expectedSubtotal, setExpectedSubtotal] = useState(0);
    const [restaurantName, setRestaurantName] = useState<string | undefined>();

    useEffect(() => {
        processBill();
    }, []);

    const processBill = async () => {
        try {
            const rawData = await mockProcessBill(imageUri);

            if (rawData.tax) setTax(Number(rawData.tax));
            if (rawData.serviceCharge) setServiceCharge(Number(rawData.serviceCharge));
            if (rawData.tip) setTip(Number(rawData.tip));
            if (rawData.discount) setDiscount(Number(rawData.discount));
            if (rawData.subtotal) setExpectedSubtotal(Number(rawData.subtotal));
            if (rawData.restaurantName) setRestaurantName(rawData.restaurantName);

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
                                name: baseName,
                                price: newPrice,
                                assignedTo: [],
                                parentId: parentItem.id
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
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={{ flex: 1 }}>
                        <StatusBar style={isDark ? 'light' : 'dark'} />
                        <View style={{ paddingTop: insets.top, flex: 1 }}>
                            {/* Header */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, backgroundColor: colors.background, zIndex: 10, width: '100%' }}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant + '4D' }}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={{ fontFamily: NEWSREADER_ITALIC_BOLD, fontSize: 22, color: isDark ? 'white' : colors.primary, fontStyle: 'italic' }}>Review Bill</Text>
                    <View style={{ width: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                        <ReceiptViewer imageUri={imageUri} />
                    </View>
                </View>

                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={{ color: isDark ? 'white' : colors.primary, marginTop: 24, fontFamily: NEWSREADER_BOLD, fontSize: 24 }}>Scanning Receipt...</Text>
                    </View>
                ) : (
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                    >
                        <View style={{ flex: 1, padding: 24 }}>
                            <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.outlineVariant + '33', overflow: 'hidden' }}>
                                <View style={{ paddingTop: 24, paddingBottom: 8, alignItems: 'center' }}>
                                    <Text style={{ fontWeight: '700', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.muted }}>Tap items to edit</Text>
                                </View>

                                <ScrollView 
                                    style={{ flex: 1, paddingHorizontal: 20 }}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {items.map((item, index) => {
                                        const isChild = !!item.parentId;
                                        return (
                                        <View
                                            key={item.id}
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderBottomWidth: (index === items.length - 1 || item.isGroup) ? 0 : 1,
                                                borderBottomColor: colors.outlineVariant + (isDark ? '40' : '1A'),
                                                paddingTop: item.isGroup ? 24 : 16,
                                                paddingBottom: item.isGroup ? 4 : 16,
                                                paddingLeft: isChild ? 24 : 0,
                                            }}
                                        >
                                            <View style={{ flex: 1, marginRight: 16, flexDirection: 'row', alignItems: 'center' }}>
                                                {isChild && (
                                                    <View style={{ marginRight: 8, opacity: 0.4, transform: [{ translateY: -1 }] }}>
                                                        <CornerDownRight size={18} color={colors.muted} />
                                                    </View>
                                                )}
                                                <TextInput
                                                    value={item.name}
                                                    onChangeText={(text) => updateItem(item.id, 'name', text)}
                                                    style={{ 
                                                        color: colors.onSurface, 
                                                        fontSize: 16, 
                                                        flex: 1, 
                                                        fontWeight: '700', 
                                                        fontStyle: item.isGroup ? 'italic' : 'normal',
                                                        paddingVertical: 4 
                                                    }}
                                                    multiline={true}
                                                    blurOnSubmit={true}
                                                    editable={!item.isGroup}
                                                />
                                            </View>
                                            {item.isGroup ? (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 36 }}>
                                                    <Text style={{ color: isDark ? 'white' : colors.primary, marginRight: 4, fontWeight: '700', fontSize: 14 }}>$</Text>
                                                    <TextInput
                                                        value={item.price.toString()}
                                                        editable={false}
                                                        style={{ color: colors.onSurface, fontSize: 16, width: 48, textAlign: 'right', fontWeight: '700', padding: 0 }}
                                                    />
                                                </View>
                                            ) : (
                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#4a3b38' : colors.surface, borderRadius: 12, paddingHorizontal: 8, height: 36, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                                    <Text style={{ color: isDark ? 'white' : colors.primary, marginRight: 4, fontWeight: '700', fontSize: 14 }}>$</Text>
                                                    <TextInput
                                                        value={item.price.toString()}
                                                        onChangeText={(text) => updateItem(item.id, 'price', text)}
                                                        keyboardType="numeric"
                                                        style={{ color: colors.onSurface, fontSize: 16, width: 48, textAlign: 'right', fontWeight: '700', padding: 0 }}
                                                    />
                                                </View>
                                            )}
                                        </View>
                                        );
                                    })}

                                    {/* Totals Section */}
                                    <View style={{ backgroundColor: colors.primary + '08', padding: 24, marginTop: 32, borderRadius: 24, borderWidth: 1, borderColor: colors.outlineVariant + '66' }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                            <Text style={{ color: colors.onSurface + '99', fontSize: 18, fontWeight: '700' }}>Subtotal</Text>
                                            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                                <Text style={{ color: isDark ? 'white' : colors.primary, fontWeight: '700', fontSize: 30, marginRight: 4 }}>$</Text>
                                                <Text style={{ color: colors.onSurface, fontSize: 30, fontWeight: '700' }}>
                                                    {subtotal.toFixed(2)}
                                                </Text>
                                            </View>
                                        </View>
                                        {expectedSubtotal > 0 && 
                                         Math.abs(Number(subtotal) - Number(discount) - Number(expectedSubtotal)) > 0.05 && 
                                         Math.abs(Number(subtotal) + Number(serviceCharge) - Number(discount) - Number(expectedSubtotal)) > 0.05 && (
                                            <View style={{ backgroundColor: colors.errorBg, padding: 12, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: colors.errorBorder, flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ color: colors.error, fontSize: 12, fontWeight: '500', flex: 1 }}>
                                                    Heads up! The sum of items (${(Number(subtotal) - Number(discount)).toFixed(2)}) doesn't match the receipt subtotal (${Number(expectedSubtotal).toFixed(2)}).
                                                </Text>
                                            </View>
                                        )}

                                        <View>
                                            {/* Discount */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <Text style={{ color: colors.onSurface + '99', fontSize: 16, fontWeight: '700' }}>Discount</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#4a3b38' : colors.surface, borderRadius: 12, paddingHorizontal: 8, height: 36, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                                    <Text style={{ color: colors.success, fontWeight: '700', marginRight: 2, fontSize: 16 }}>-</Text>
                                                    <Text style={{ color: isDark ? 'white' : colors.primary, marginRight: 4, fontWeight: '700', fontSize: 14 }}>$</Text>
                                                    <TextInput
                                                        value={discount.toString()}
                                                        onChangeText={(val) => setDiscount(Number(val) || 0)}
                                                        keyboardType="decimal-pad"
                                                        style={{ color: colors.success, fontSize: 16, width: 56, textAlign: 'right', fontWeight: '700', padding: 0 }}
                                                    />
                                                </View>
                                            </View>

                                             {/* Taxes & Fees */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <Text style={{ color: colors.onSurface + '99', fontSize: 16, fontWeight: '700' }}>Taxes & Fees</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#4a3b38' : colors.surface, borderRadius: 12, paddingHorizontal: 8, height: 36, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                                    <Text style={{ color: isDark ? 'white' : colors.primary, marginRight: 4, fontWeight: '700', fontSize: 14 }}>$</Text>
                                                    <TextInput
                                                        value={tax.toString()}
                                                        onChangeText={(val) => setTax(Number(val) || 0)}
                                                        keyboardType="decimal-pad"
                                                        style={{ color: colors.onSurface, fontSize: 16, width: 56, textAlign: 'right', fontWeight: '700', padding: 0 }}
                                                    />
                                                </View>
                                            </View>

                                            {/* Service Charge */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <Text style={{ color: colors.onSurface + '99', fontSize: 16, fontWeight: '700' }}>Service Charge</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#4a3b38' : colors.surface, borderRadius: 12, paddingHorizontal: 8, height: 36, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                                    <Text style={{ color: isDark ? 'white' : colors.primary, marginRight: 4, fontWeight: '700', fontSize: 14 }}>$</Text>
                                                    <TextInput
                                                        value={serviceCharge.toString()}
                                                        onChangeText={(val) => setServiceCharge(Number(val) || 0)}
                                                        keyboardType="decimal-pad"
                                                        style={{ color: colors.onSurface, fontSize: 16, width: 56, textAlign: 'right', fontWeight: '700', padding: 0 }}
                                                    />
                                                </View>
                                            </View>

                                            {/* Tip */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <Text style={{ color: colors.onSurface + '99', fontSize: 16, fontWeight: '700' }}>Tip</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#4a3b38' : colors.surface, borderRadius: 12, paddingHorizontal: 8, height: 36, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                                    <Text style={{ color: isDark ? 'white' : colors.primary, marginRight: 4, fontWeight: '700', fontSize: 14 }}>$</Text>
                                                    <TextInput
                                                        value={tip.toString()}
                                                        onChangeText={(val) => setTip(Number(val) || 0)}
                                                        keyboardType="decimal-pad"
                                                        style={{ color: colors.onSurface, fontSize: 16, width: 56, textAlign: 'right', fontWeight: '700', padding: 0 }}
                                                    />
                                                </View>
                                            </View>

                                            <View style={{ height: 1, backgroundColor: colors.outlineVariant + '4D', width: '100%', marginBottom: 16 }} />

                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: '700' }}>Total</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                                    <Text style={{ color: isDark ? 'white' : colors.primary, fontWeight: '700', fontSize: 20, marginRight: 4 }}>$</Text>
                                                    <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: '700' }}>
                                                        {Math.max(0, subtotal - discount + tax + serviceCharge + tip).toFixed(2)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>

                        {/* Bottom Action */}
                        <View style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 }}>
                            <TouchableOpacity
                                style={{ backgroundColor: colors.primary, paddingVertical: 20, borderRadius: 24, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}
                                onPress={() => navigation.navigate('Splitting', { items, tax, serviceCharge, tip, discount, expectedSubtotal, imageUri, restaurantName })}
                                activeOpacity={0.9}
                            >
                                <Text style={{ color: colors.onPrimary, fontSize: 20, fontWeight: '700', marginRight: 12 }}>Start Splitting</Text>
                                <Check size={22} color={colors.onPrimary} strokeWidth={3} />
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
