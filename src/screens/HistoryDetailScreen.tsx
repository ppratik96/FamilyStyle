import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Utensils, Users, Receipt, CornerDownRight, Trash2 } from 'lucide-react-native';
import { Alert } from 'react-native';
import { HistoryService } from '../services/historyService';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../ThemeContext';
import { HistoryItem } from '../types';
import { OutlinedText } from '../components/OutlinedText';

export default function HistoryDetailScreen({ navigation, route }: any) {
    const { bill }: { bill: HistoryItem } = route.params;
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getUserColor = (userId: string) => {
        if (userId === 'me') return { bg: '#ffffff', border: colors.primary };
        const palette = [
            { bg: '#e1f5ed', border: '#acdcc8' },
            { bg: '#eef2e1', border: '#cdd6b2' },
            { bg: '#f5f0e1', border: '#dac99f' },
            { bg: '#faecec', border: '#e8afaf' },
            { bg: '#e1f0f5', border: '#b2d5e0' },
            { bg: '#f0e1fa', border: '#ccaae8' },
        ];
        const index = (userId.charCodeAt(0) + userId.length) % palette.length;
        return palette[index];
    };

    const handleDeleteBill = () => {
        Alert.alert(
            "Delete Bill",
            "Are you sure you want to remove this bill from your history? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        await HistoryService.deleteBill(bill.id);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar style={isDark ? "light" : "dark"} />
            
            {/* Header */}
            <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
                <View style={{ height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 }}>
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outlineVariant + '33' }}
                    >
                        <ArrowLeft size={20} color={colors.onSurface} />
                    </TouchableOpacity>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <OutlinedText 
                            style={{ fontFamily: 'Newsreader_700Bold_Italic', fontSize: 24, color: colors.primary }}
                            outlineColor="transparent"
                        >
                            Split Details
                        </OutlinedText>
                    </View>
                    <TouchableOpacity 
                        onPress={handleDeleteBill}
                        style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outlineVariant + '33' }}
                    >
                        <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <ScrollView 
                contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInDown.duration(600)}>
                    {/* Summary Card */}
                    <View style={{ backgroundColor: colors.surface, borderRadius: 32, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ backgroundColor: colors.primary + '15', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                <Utensils size={28} color={colors.primary} />
                            </View>
                            <Text style={{ fontSize: 24, fontWeight: '800', color: colors.onSurface, textAlign: 'center', fontFamily: 'Newsreader_700Bold' }}>
                                {bill.restaurantName || 'Restaurant'}
                            </Text>
                            <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, opacity: 0.7, marginTop: 4 }}>
                                {formatDate(bill.date)}
                            </Text>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.outlineVariant + '33', marginBottom: 20 }} />

                        <View style={{ gap: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: colors.onSurfaceVariant }}>Subtotal</Text>
                                <Text style={{ color: colors.onSurface, fontWeight: '600' }}>${bill.subtotal.toFixed(2)}</Text>
                            </View>
                            {bill.tax > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.onSurfaceVariant }}>Tax</Text>
                                    <Text style={{ color: colors.onSurface, fontWeight: '600' }}>${bill.tax.toFixed(2)}</Text>
                                </View>
                            )}
                            {bill.tip > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.onSurfaceVariant }}>Tip</Text>
                                    <Text style={{ color: colors.onSurface, fontWeight: '600' }}>${bill.tip.toFixed(2)}</Text>
                                </View>
                            )}
                            {bill.serviceCharge > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.onSurfaceVariant }}>Service Charge</Text>
                                    <Text style={{ color: colors.onSurface, fontWeight: '600' }}>${bill.serviceCharge.toFixed(2)}</Text>
                                </View>
                            )}
                            {bill.discount > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ color: colors.error }}>Discount</Text>
                                    <Text style={{ color: colors.error, fontWeight: '600' }}>-${bill.discount.toFixed(2)}</Text>
                                </View>
                            )}
                            <View style={{ height: 1, backgroundColor: colors.outlineVariant + '33', marginVertical: 8 }} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface }}>Total Split</Text>
                                <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>${bill.totalAmount.toFixed(2)}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Items Section (Only if available) */}
                    {bill.items && bill.items.length > 0 && (
                        <View style={{ marginBottom: 32 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <Receipt size={18} color={colors.primary} style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, fontFamily: 'Newsreader_700Bold' }}>Line Items</Text>
                            </View>
                            <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                {bill.items.filter(i => !i.parentId).map((item, index) => (
                                    <View key={item.id} style={{ marginBottom: index === (bill.items?.length || 0) - 1 ? 0 : 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.onSurface, flex: 1 }}>{item.name}</Text>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.onSurface }}>${item.price.toFixed(2)}</Text>
                                        </View>
                                        {/* Show who split it */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, opacity: 0.6 }}>Split by </Text>
                                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '600' }}>
                                                {item.assignedTo.length} {item.assignedTo.length === 1 ? 'person' : 'people'}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Individual Breakdown Section */}
                    <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <Users size={18} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, fontFamily: 'Newsreader_700Bold' }}>Who Paid What</Text>
                        </View>
                        <View style={{ gap: 12 }}>
                            {bill.users.map((user) => {
                                const userColor = getUserColor(user.id);
                                return (
                                    <View 
                                        key={user.id}
                                        style={{ 
                                            flexDirection: 'row', 
                                            alignItems: 'center', 
                                            backgroundColor: colors.surface, 
                                            padding: 16, 
                                            borderRadius: 20,
                                            borderWidth: 1,
                                            borderColor: colors.outlineVariant + '33'
                                        }}
                                    >
                                        <View style={{ 
                                            width: 40, 
                                            height: 40, 
                                            borderRadius: 20, 
                                            backgroundColor: userColor.bg, 
                                            borderWidth: 1, 
                                            borderColor: userColor.border,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 16
                                        }}>
                                            <Text style={{ fontWeight: '700', color: user.id === 'me' ? colors.primary : colors.onSurface }}>
                                                {user.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: '700', color: colors.onSurface }}>{user.id === 'me' ? 'You' : user.name}</Text>
                                            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, opacity: 0.6 }}>
                                                {user.wasRequested ? 'Requested via SMS' : (user.id === 'me' ? 'Your contribution' : 'Paid in full')}
                                            </Text>
                                        </View>
                                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface }}>
                                            ${user.amount.toFixed(2)}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}
