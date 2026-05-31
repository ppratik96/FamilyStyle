import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BarChart3, Users, Utensils, Calendar, ChevronRight, TrendingUp } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../ThemeContext';
import { HistoryService } from '../services/historyService';
import { HistoryItem, Metrics } from '../types';
import { OutlinedText } from '../components/OutlinedText';

const { width } = Dimensions.get('window');

export default function HistoryScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadData();
        });
        return unsubscribe;
    }, [navigation]);

    const loadData = async () => {
        setLoading(true);
        const [hist, met] = await Promise.all([
            HistoryService.getHistory(),
            HistoryService.getMetrics()
        ]);
        setHistory(hist);
        setMetrics(met);
        setLoading(false);
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    };

    const StatCard = ({ title, value, icon: Icon, delay = 0 }: any) => (
        <Animated.View 
            entering={FadeInDown.delay(delay).duration(600)}
            style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: 16,
                width: (width - 64) / 2,
                borderWidth: 1,
                borderColor: colors.outlineVariant + '33',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
            }}
        >
            <View style={{ backgroundColor: colors.primary + '15', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={18} color={colors.primary} />
            </View>
            <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, marginBottom: 4, fontWeight: '500' }}>{title}</Text>
            <Text style={{ fontSize: 18, color: colors.onSurface, fontWeight: '700' }} numberOfLines={1}>{value}</Text>
        </Animated.View>
    );

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
                    <View style={{ flex: 1, alignItems: 'center', marginRight: 40 }}>
                        <OutlinedText 
                            style={{ fontFamily: 'Newsreader_700Bold_Italic', fontSize: 24, color: isDark ? 'white' : colors.primary }}
                            outlineColor="transparent"
                        >
                            History & Stats
                        </OutlinedText>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView 
                contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Stats Grid */}
                {metrics && metrics.totalBillsSplit > 0 ? (
                    <View style={{ marginBottom: 32 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <TrendingUp size={18} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, fontFamily: 'Newsreader_700Bold' }}>Quick Stats</Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                            <StatCard title="Total Bills" value={metrics.totalBillsSplit} icon={Calendar} delay={0} />
                            <StatCard title="Total Spent" value={`$${metrics.totalSpent.toFixed(0)}`} icon={BarChart3} delay={100} />
                            <StatCard title="Top Spot" value={metrics.mostVisitedRestaurant || 'N/A'} icon={Utensils} delay={200} />
                            <StatCard title="Top Partner" value={metrics.mostSplitWith || 'N/A'} icon={Users} delay={300} />
                        </View>
                    </View>
                ) : null}

                {/* History List */}
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                        <Calendar size={18} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, fontFamily: 'Newsreader_700Bold' }}>Past Splits</Text>
                    </View>

                    {history.length === 0 ? (
                        <Animated.View 
                            entering={FadeIn.delay(400)}
                            style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}
                        >
                            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <Utensils size={40} color={colors.muted} />
                            </View>
                            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.onSurface, marginBottom: 8 }}>No history yet</Text>
                            <Text style={{ fontSize: 14, color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 40 }}>
                                Your splits will appear here once you finish a bill.
                            </Text>
                        </Animated.View>
                    ) : (
                        history.map((item, index) => (
                            <Animated.View 
                                key={item.id}
                                entering={FadeInDown.delay(100 * (index % 10)).duration(600)}
                            >
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('HistoryDetail', { bill: item })}
                                    style={{
                                        backgroundColor: colors.surface,
                                        borderRadius: 24,
                                        padding: 20,
                                        marginBottom: 16,
                                        borderWidth: 1,
                                        borderColor: colors.outlineVariant + '33',
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.onSurface, flex: 1 }} numberOfLines={1}>
                                                {item.restaurantName || 'Restaurant'}
                                            </Text>
                                            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>
                                                ${item.totalAmount.toFixed(2)}
                                            </Text>
                                        </View>
                                        
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, opacity: 0.7 }}>
                                                {formatDate(item.date)}
                                            </Text>
                                            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.muted, marginHorizontal: 8, opacity: 0.5 }} />
                                            <Text style={{ fontSize: 13, color: colors.onSurfaceVariant, opacity: 0.7 }}>
                                                {item.users.length} people
                                            </Text>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row' }}>
                                                {item.users.slice(0, 3).map((user, i) => (
                                                    <View 
                                                        key={user.id}
                                                        style={{ 
                                                            width: 28, 
                                                            height: 28, 
                                                            borderRadius: 14, 
                                                            backgroundColor: colors.surfaceContainerLow, 
                                                            borderWidth: 2, 
                                                            borderColor: colors.surface,
                                                            marginLeft: i === 0 ? 0 : -10,
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                ))}
                                                {item.users.length > 3 && (
                                                    <View 
                                                        style={{ 
                                                            width: 28, 
                                                            height: 28, 
                                                            borderRadius: 14, 
                                                            backgroundColor: colors.muted + '33', 
                                                            borderWidth: 2, 
                                                            borderColor: colors.surface,
                                                            marginLeft: -10,
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}
                                                    >
                                                        <Text style={{ fontSize: 10, fontWeight: '700', color: colors.onSurfaceVariant }}>
                                                            +{item.users.length - 3}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                    <ChevronRight size={20} color={colors.muted} />
                                </TouchableOpacity>
                            </Animated.View>
                        ))
                    )}
                    
                    {history.length > 0 && (
                        <TouchableOpacity 
                            onPress={() => {
                                Alert.alert(
                                    "Clear History",
                                    "This will delete all your past bill splits and reset your statistics. Are you sure?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        { 
                                            text: "Clear All", 
                                            style: "destructive",
                                            onPress: async () => {
                                                await HistoryService.clearHistory();
                                                loadData();
                                            }
                                        }
                                    ]
                                );
                            }}
                            style={{ 
                                marginTop: 40, 
                                paddingVertical: 12, 
                                alignItems: 'center',
                                opacity: 0.5
                            }}
                        >
                            <Text style={{ color: colors.error, fontSize: 14, fontWeight: '600' }}>Clear All History</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
