import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Utensils, Users, Receipt, CornerDownRight, Trash2, Send, Check, MessageSquare, Share as ShareIcon } from 'lucide-react-native';
import { Alert, Share } from 'react-native';
import * as SMS from 'expo-sms';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryService } from '../services/historyService';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../ThemeContext';
import { HistoryItem, User } from '../types';
import { OutlinedText } from '../components/OutlinedText';

export default function HistoryDetailScreen({ navigation, route }: any) {
    const { bill }: { bill: HistoryItem } = route.params;
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    const [sentUsers, setSentUsers] = React.useState<Record<string, boolean>>({});
    const [venmoUsername, setVenmoUsername] = React.useState('');
    const [sharingMode, setSharingMode] = React.useState<"individual" | "group">("individual");

    React.useEffect(() => {
        const loadSettings = async () => {
            try {
                const savedVenmo = await AsyncStorage.getItem('venmoUsername');
                if (savedVenmo) setVenmoUsername(savedVenmo);
            } catch (e) {}
        };
        loadSettings();
    }, []);

    const generateSummary = () => {
        const note = bill.restaurantName ? `Dinner at ${bill.restaurantName}` : 'Bill Summary';
        let summary = `🍽️ ${note}\n\n`;
        bill.users.forEach((user) => {
            if (user.id === 'me') return;
            if (user.amount > 0) {
                summary += `${user.name}: $${user.amount.toFixed(2)}\n`;
            }
        });

        if (venmoUsername) {
            const cleanUsername = venmoUsername.trim().replace('@', '');
            summary += `\nPay via Venmo (@${cleanUsername}): https://venmo.com/?txn=pay&recipients=${cleanUsername}`;
        }
        
        summary += `\n\nSplit using https://TheFamilyStyle.app`;
        return summary;
    };

    const shareViaSMS = async () => {
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
            Alert.alert("Error", "SMS is not available");
            return;
        }
        const recipients = bill.users
            .filter(u => u.id !== 'me' && u.phoneNumber && u.phoneNumber.trim().length > 0)
            .map(u => u.phoneNumber as string);

        await SMS.sendSMSAsync(recipients, generateSummary());
    };

    const shareViaSystem = async () => {
        try {
            await Share.share({
                message: generateSummary(),
            });
        } catch (error) {
            console.error(error);
        }
    };

    const sendRequest = async (userName: string, userId: string, amount: number, phoneNumber?: string) => {
        const isAvailable = await SMS.isAvailableAsync();
        if (!isAvailable) {
            Alert.alert("Error", "SMS is not available on this device");
            return;
        }

        const note = bill.restaurantName ? `Dinner at ${bill.restaurantName}` : 'the bill';
        let message = `Hey, your share of ${note} is $${amount.toFixed(2)}.`;
        
        if (venmoUsername) {
            const cleanVenmo = venmoUsername.trim().replace('@', '');
            const encodedNote = note ? encodeURIComponent(note.replace(/ /g, '\u00A0')) : '';
            const venmoUrl = `https://venmo.com/?txn=pay&recipients=${cleanVenmo}&amount=${amount.toFixed(2)}${encodedNote ? `&note=${encodedNote}` : ''}`;
            message += ` You can venmo me (@${cleanVenmo}) here: ${venmoUrl}`;
        }

        message += `\n\nSplit using https://TheFamilyStyle.app`;

        const recipients = phoneNumber ? [phoneNumber] : [];
        const { result } = await SMS.sendSMSAsync(recipients, message);
        if (result === 'sent') {
            setSentUsers(prev => ({ ...prev, [userId]: true }));
        }
    };

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
                            style={{ fontFamily: 'Newsreader_700Bold_Italic', fontSize: 24, color: isDark ? 'white' : colors.primary }}
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
                                {bill && bill.items && bill.items.length > 0 && (bill.items as any[]).filter(i => !i.parentId).map((item, index) => (
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
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, fontFamily: 'Newsreader_700Bold' }}>Sharing</Text>
                        </View>

                        {/* Sharing Mode Toggle */}
                        <View style={{ 
                            flexDirection: 'row', 
                            backgroundColor: isDark ? '#2b2220' : '#f6f3ee', 
                            padding: 6, 
                            borderRadius: 16, 
                            marginBottom: 24, 
                            borderWidth: 1, 
                            borderColor: colors.outlineVariant + '33' 
                        }}>
                            <TouchableOpacity 
                                onPress={() => setSharingMode('individual')}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    backgroundColor: sharingMode === 'individual' ? colors.primary : 'transparent',
                                    ...(sharingMode === 'individual' ? {
                                        shadowColor: '#85341f',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 4,
                                        elevation: 4
                                    } : {})
                                }}
                            >
                                <Send size={14} color={sharingMode === 'individual' ? 'white' : (isDark ? 'white' : colors.primary)} style={{ opacity: sharingMode === 'individual' ? 1 : 0.6 }} />
                                <Text style={{ 
                                    fontFamily: 'Newsreader_700Bold', 
                                    marginLeft: 8, 
                                    fontSize: 14,
                                    color: sharingMode === 'individual' ? 'white' : (isDark ? 'white' : colors.primary),
                                    opacity: sharingMode === 'individual' ? 1 : (isDark ? 0.6 : 1)
                                }}>Individual</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                onPress={() => setSharingMode('group')}
                                activeOpacity={0.8}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    backgroundColor: sharingMode === 'group' ? colors.primary : 'transparent',
                                    ...(sharingMode === 'group' ? {
                                        shadowColor: '#85341f',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.3,
                                        shadowRadius: 4,
                                        elevation: 4
                                    } : {})
                                }}
                            >
                                <MessageSquare size={14} color={sharingMode === 'group' ? 'white' : (isDark ? 'white' : colors.primary)} style={{ opacity: sharingMode === 'group' ? 1 : 0.6 }} />
                                <Text style={{ 
                                    fontFamily: 'Newsreader_700Bold', 
                                    marginLeft: 8, 
                                    fontSize: 14,
                                    color: sharingMode === 'group' ? 'white' : (isDark ? 'white' : colors.primary),
                                    opacity: sharingMode === 'group' ? 1 : (isDark ? 0.6 : 1)
                                }}>Group Chat</Text>
                            </TouchableOpacity>
                        </View>

                        {sharingMode === 'group' ? (
                            <Animated.View entering={FadeIn}>
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                                    <TouchableOpacity
                                        onPress={shareViaSMS}
                                        style={{
                                            flex: 1,
                                            backgroundColor: colors.primary,
                                            paddingVertical: 16,
                                            borderRadius: 20,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shadowColor: '#85341f',
                                            shadowOffset: { width: 0, height: 4 },
                                            shadowOpacity: 0.3,
                                            shadowRadius: 8,
                                            elevation: 6,
                                        }}
                                        activeOpacity={0.9}
                                    >
                                        <MessageSquare size={18} color="white" />
                                        <Text style={{ color: 'white', fontWeight: '800', marginLeft: 8 }}>Text Group</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={shareViaSystem}
                                        style={{
                                            flex: 1,
                                            paddingVertical: 16,
                                            borderRadius: 20,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderWidth: 2,
                                            borderColor: colors.primary + '40',
                                            backgroundColor: isDark ? colors.outlineVariant + '33' : 'transparent',
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <ShareIcon size={18} color={isDark ? 'white' : colors.primary} />
                                        <Text style={{ color: isDark ? 'white' : colors.primary, fontWeight: '800', marginLeft: 8 }}>Share Totals</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Group Summary Preview */}
                                <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: colors.outlineVariant + '33' }}>
                                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14, marginBottom: 16, opacity: 0.8, letterSpacing: 1 }}>FINAL TALLY</Text>
                                    {bill.users.filter(u => u.id !== 'me').map((user) => {
                                        if (user.amount === 0) return null;
                                        return (
                                            <View key={user.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <Text style={{ color: colors.onSurface, fontSize: 16, fontWeight: '600' }}>{user.name}</Text>
                                                <Text style={{ color: colors.onSurface, fontSize: 16, fontWeight: '800' }}>${user.amount.toFixed(2)}</Text>
                                            </View>
                                        );
                                    })}
                                    <View style={{ height: 1, backgroundColor: colors.outlineVariant + '33', marginVertical: 12 }} />
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '800' }}>Group Total</Text>
                                        <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '800' }}>
                                            ${bill.users.filter(u => u.id !== 'me').reduce((acc, u) => acc + u.amount, 0).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </Animated.View>
                        ) : (
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
                                                <Text style={{ fontWeight: '700', color: colors.primary }}>
                                                    {user.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={{ fontWeight: '700', color: colors.onSurface }}>{user.id === 'me' ? 'You' : user.name}</Text>
                                                <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, opacity: 0.6 }}>
                                                    {user.id === 'me' ? 'Your contribution' : (user.wasRequested || sentUsers[user.id] ? 'Requested via SMS' : 'Awaiting request')}
                                                </Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, marginRight: user.id === 'me' ? 0 : 12 }}>
                                                    ${user.amount.toFixed(2)}
                                                </Text>
                                                
                                                {user.id !== 'me' && (
                                                    <TouchableOpacity
                                                        onPress={() => sendRequest(user.name, user.id, user.amount, user.phoneNumber)}
                                                        style={{
                                                            minWidth: 64,
                                                            paddingVertical: 8,
                                                            paddingHorizontal: 12,
                                                            borderRadius: 12,
                                                            borderWidth: 1,
                                                            backgroundColor: sentUsers[user.id] ? colors.success + '1A' : colors.primary + '1A',
                                                            borderColor: sentUsers[user.id] ? colors.success + '33' : colors.primary + '33',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }}
                                                        activeOpacity={0.8}
                                                    >
                                                        {sentUsers[user.id] ? (
                                                            <Send size={14} color={isDark ? colors.success : '#15803d'} />
                                                        ) : (
                                                            <Send size={14} color={isDark ? 'white' : colors.primary} />
                                                        )}
                                                        <Text 
                                                            style={{ 
                                                                fontSize: 8, 
                                                                fontWeight: '800',
                                                                marginTop: 2,
                                                                color: sentUsers[user.id] 
                                                                    ? (isDark ? colors.success : '#15803d') 
                                                                    : (isDark ? 'white' : colors.primary),
                                                                letterSpacing: 0.5
                                                            }}
                                                        >
                                                            {(sentUsers[user.id] || user.wasRequested) ? 'RESEND' : 'REQUEST'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
}
