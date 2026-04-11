import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, TextInput, ActivityIndicator, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, X, Users, Check, ChevronDown, ChevronUp } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BillItem, User } from '../types';
import { getContacts, getContactFrequencies, incrementContactFrequency } from '../services/contactsService';

import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import ReceiptViewer from '../components/ReceiptViewer';

// Font Constants
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

export default function SplittingScreen({ navigation, route }: any) {
    const { items: initialItems, imageUri, restaurantName } = route.params;
    const insets = useSafeAreaInsets();

    const [items, setItems] = useState<BillItem[]>(initialItems.filter((i: BillItem) => !i.isGroup));
    const [users, setUsers] = useState<User[]>([{ id: 'me', name: 'Me', initials: 'ME' }]);
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [displayItemId, setDisplayItemId] = useState<string | null>(null);
    const [isContactModalVisible, setContactModalVisible] = useState(false);
    const [isNewContactExpanded, setIsNewContactExpanded] = useState(false);
    const [manualFirstName, setManualFirstName] = useState('');
    const [manualLastName, setManualLastName] = useState('');
    const [manualPhone, setManualPhone] = useState('');
    const [contacts, setContacts] = useState<User[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userMultipliers, setUserMultipliers] = useState<Record<string, number>>({});

    useEffect(() => {
        if (selectedItemId) setDisplayItemId(selectedItemId);
        else setDisplayItemId(null);
    }, [selectedItemId]);

    const selectedItemIdRef = useRef(selectedItemId);
    const usersRef = useRef(users);
    const userMultipliersRef = useRef(userMultipliers);
    useEffect(() => { selectedItemIdRef.current = selectedItemId; }, [selectedItemId]);
    useEffect(() => { usersRef.current = users; }, [users]);
    useEffect(() => { userMultipliersRef.current = userMultipliers; }, [userMultipliers]);

    useEffect(() => {
        const loadSession = async () => {
            try {
                const sessionStr = await AsyncStorage.getItem('current_split_session');
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    if (session.imageUri === imageUri) {
                        const mergedItems = initialItems.filter((i: BillItem) => !i.isGroup).map((newItem: BillItem) => {
                            const savedItem = session.items.find((i: BillItem) => i.id === newItem.id);
                            return savedItem ? { ...newItem, assignedTo: savedItem.assignedTo } : newItem;
                        });
                        setItems(mergedItems);
                        if (session.users) setUsers(session.users);
                        if (session.userMultipliers) setUserMultipliers(session.userMultipliers);
                        return;
                    }
                }
            } catch (e) {
                console.error('[Lifecycle] Error loading session:', e);
            }
            setItems(initialItems.filter((i: BillItem) => !i.isGroup));
            setUsers([{ id: 'me', name: 'Me', initials: 'ME' }]);
            setUserMultipliers({});
        };
        loadSession();
    }, [initialItems, imageUri]);

    useEffect(() => {
        if (items.length > 0) {
            AsyncStorage.setItem('current_split_session', JSON.stringify({ imageUri, items, users, userMultipliers })).catch(() => {});
        }
    }, [items, users, userMultipliers, imageUri]);

    const getUserTotal = (userId: string) => {
        return items.reduce((total, item) => {
            const userShares = item.assignedTo.filter(id => id === userId).length;
            if (userShares > 0) return total + ((item.price / item.assignedTo.length) * userShares);
            return total;
        }, 0);
    };

    const getUserMaxShares = (userId: string) => {
        let max = userMultipliers[userId] || 1;
        items.forEach(item => {
            const shares = item.assignedTo.filter(id => id === userId).length;
            if (shares > max) max = shares;
        });
        return max;
    };

    const addOneAssignment = useCallback((userId: string) => {
        const targetId = selectedItemIdRef.current;
        if (!targetId) return;
        setItems(prevItems => prevItems.map(item =>
            item.id === targetId ? { ...item, assignedTo: [...item.assignedTo, userId] } : item
        ));
    }, []);

    const removeOneAssignment = useCallback((userId: string) => {
        const targetId = selectedItemIdRef.current;
        if (!targetId) return;
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== targetId) return item;
            const index = item.assignedTo.lastIndexOf(userId);
            if (index === -1) return item;
            const newAssigned = [...item.assignedTo];
            newAssigned.splice(index, 1);
            return { ...item, assignedTo: newAssigned };
        }));
    }, []);

    const assignAll = useCallback(() => {
        const targetId = selectedItemIdRef.current;
        const currentUsers = usersRef.current;
        const currentMultipliers = userMultipliersRef.current;
        if (!targetId) return;
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== targetId) return item;
            const allAssigned: string[] = [];
            currentUsers.forEach(u => {
                const mult = currentMultipliers[u.id] || 1;
                allAssigned.push(...Array(mult).fill(u.id));
            });
            return { ...item, assignedTo: allAssigned };
        }));
    }, []);

    const removeAll = useCallback(() => {
        const targetId = selectedItemIdRef.current;
        if (!targetId) return;
        setItems(prevItems => prevItems.map(item =>
            item.id === targetId ? { ...item, assignedTo: [] } : item
        ));
    }, []);

    const fetchContacts = async () => {
        setLoadingContacts(true);
        const fetchedContacts = await getContacts();
        setContacts(fetchedContacts);
        setLoadingContacts(false);
    };

    const toggleUser = (user: User) => {
        if (users.find(u => u.id === user.id)) {
            if (user.id !== 'me') {
                setUsers(users.filter(u => u.id !== user.id));
                setItems(prevItems => prevItems.map(item => ({ ...item, assignedTo: item.assignedTo.filter(id => id !== user.id) })));
            }
        } else {
            setUsers([...users, user]);
            incrementContactFrequency(user.id);
        }
    };

    const incrementGlobalShare = (userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setUserMultipliers(prev => ({ ...prev, [userId]: (prev[userId] || 1) + 1 }));
        setItems(prevItems => prevItems.map(item => item.assignedTo.includes(userId) ? { ...item, assignedTo: [...item.assignedTo, userId] } : item ));
    };

    const decrementGlobalShare = (userId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setUserMultipliers(prev => {
            const current = prev[userId] || 1;
            if (current <= 1) return prev;
            return { ...prev, [userId]: current - 1 };
        });
        setItems(prevItems => prevItems.map(item => {
            const shares = item.assignedTo.filter((id: string) => id === userId).length;
            if (shares > 1) {
                const index = item.assignedTo.indexOf(userId);
                const newAssigned = [...item.assignedTo];
                newAssigned.splice(index, 1);
                return { ...item, assignedTo: newAssigned };
            }
            return item;
        }));
    };

    return (
        <NavigationContext.Provider value={navigation}>
            <NavigationRouteContext.Provider value={route}>
                <View style={{ flex: 1, backgroundColor: '#fcf9f4' }}>
                    <View style={{ flex: 1, paddingTop: insets.top }}>
                        
                        {/* Header */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12 }}>
                            <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [{ width: 44, opacity: pressed ? 0.5 : 1 }]}>
                                <ArrowLeft size={22} color="#85341f" />
                            </Pressable>
                            <Text style={{ fontFamily: NEWSREADER_ITALIC_BOLD, fontSize: 22, color: '#85341f', fontStyle: 'italic' }}>Split the Tab</Text>
                            <View style={{ width: 44, alignItems: 'flex-end' }}>
                                <ReceiptViewer imageUri={imageUri} />
                            </View>
                        </View>

                        {/* Instructional Sub-header */}
                        <View style={{ marginTop: 24, marginBottom: 12, alignItems: 'center', paddingHorizontal: 24 }}>
                            <Text style={{ fontSize: 9, color: '#aba9a2', letterSpacing: 1.2, fontWeight: '600', textAlign: 'center' }}>
                                TAP AVATAR TO COVER GUESTS (+1). HOLD TO REMOVE (−1).
                            </Text>
                        </View>

                        {/* Avatar List Row */}
                        <View style={{ marginBottom: 12 }}>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                contentContainerStyle={{ 
                                    paddingHorizontal: 24, 
                                    paddingVertical: 10,
                                    alignItems: 'center',
                                    gap: 16
                                }}
                            >
                                {users.map((user, index) => {
                                    const maxShares = getUserMaxShares(user.id);
                                    const userColor = getUserColor(user.id);

                                    return (
                                        <Pressable 
                                            key={user.id} 
                                            onPress={() => incrementGlobalShare(user.id)} 
                                            onLongPress={() => decrementGlobalShare(user.id)} 
                                            style={({ pressed }) => [{ 
                                                alignItems: 'center', 
                                                transform: [{ scale: pressed ? 0.95 : 1 }]
                                            }]}
                                        >
                                            <View style={{ 
                                                width: 52, 
                                                height: 52, 
                                                borderRadius: 26, 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                marginBottom: 8, 
                                                backgroundColor: userColor.bg, 
                                                borderWidth: 1.5, 
                                                borderColor: userColor.border,
                                                shadowColor: '#000', 
                                                shadowOffset: { width: 0, height: 2 }, 
                                                shadowOpacity: 0.04, 
                                                shadowRadius: 3
                                            }}>
                                                <Text style={{ fontWeight: '700', fontSize: 18, color: '#85341f' }}>{user.initials}</Text>
                                                {maxShares > 1 && (
                                                    <View style={{ position: 'absolute', top: -2, left: -2, backgroundColor: '#1c1c19', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fcf9f4' }}>
                                                        <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>x{maxShares}</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View className="flex-row items-baseline">
                                                <Text className="text-primary/60 font-body font-bold text-base mr-0.5">$</Text>
                                                <Text className="text-primary font-body font-bold text-lg">
                                                    {getUserTotal(user.id).toFixed(2)}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                                <Pressable 
                                    onPress={() => { fetchContacts(); setContactModalVisible(true); }} 
                                    style={({ pressed }) => [{ 
                                        alignItems: 'center', 
                                        transform: [{ scale: pressed ? 0.92 : 1 }],
                                        marginLeft: 4
                                    }]}
                                >
                                    <View style={{ alignItems: 'center' }}>
                                        <View style={{ 
                                            width: 52, 
                                            height: 52, 
                                            borderRadius: 26, 
                                            backgroundColor: '#ffffff', 
                                            borderColor: '#dbc1ba', 
                                            borderWidth: 1.2, 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            marginBottom: 8 
                                        }}>
                                            <Plus size={24} color="#85341f" />
                                        </View>
                                        <View style={{ height: 26, justifyContent: 'center' }}>
                                            <Text className="font-bold text-lg text-primary uppercase text-center">ADD</Text>
                                        </View>
                                    </View>
                                </Pressable>
                            </ScrollView>
                        </View>

                        {/* Global Actions */}
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    const allUserIds = users.flatMap(u => {
                                        const shares = getUserMaxShares(u.id);
                                        return Array(shares).fill(u.id);
                                    });
                                    setItems(prevItems => prevItems.map(item => ({
                                        ...item,
                                        assignedTo: [...allUserIds]
                                    })));
                                }}
                                style={{
                                    backgroundColor: 'rgba(133, 52, 31, 0.08)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(133, 52, 31, 0.15)',
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 16,
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={{ color: '#85341f', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>SPLIT ALL ITEMS EVENLY</Text>
                            </TouchableOpacity>
                        </View>
                        {/* Item List */}
                        <View style={{ flex: 1 }}>
                            <FlatList
                                data={items}
                                keyExtractor={(item) => item.id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 160, paddingTop: 6 }}
                                ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                                renderItem={({ item }) => {
                                    const isSplit = item.assignedTo.length > 0;
                                    const isSelected = selectedItemId === item.id;

                                    return (
                                        <View 
                                            className="shadow-sm"
                                            style={{ 
                                            backgroundColor: '#ffffff', 
                                            borderRadius: 24,
                                            borderWidth: 1.2, 
                                            borderColor: 'rgba(219, 193, 186, 0.45)',
                                            marginHorizontal: 2, // Slight buffer
                                            paddingHorizontal: 16,
                                            paddingVertical: 14
                                        }}>
                                            <Pressable 
                                                onPress={() => {
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setSelectedItemId(item.id);
                                                }} 
                                                style={({ pressed }) => ({ 
                                                    opacity: pressed ? 0.7 : 1
                                                })}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <View style={{ flex: 1, paddingRight: 20 }}>
                                                        <Text style={{ fontWeight: '700', fontSize: 16, color: '#1c1c19', letterSpacing: -0.2, lineHeight: 22 }}>{item.name}</Text>
                                                        <Text style={{ fontStyle: 'italic', fontSize: 13, color: '#85341f', opacity: 0.5, marginTop: 4 }}>
                                                            {isSplit ? `Split with ${item.assignedTo.length} ${item.assignedTo.length === 1 ? 'person' : 'people'}` : 'Unassigned'}
                                                        </Text>
                                                    </View>
                                                    <View className="flex-row items-center">
                                                        <Text className="text-primary/60 font-body font-bold mr-1" style={{ fontSize: 14, transform: [{ translateY: 1.5 }] }}>$</Text>
                                                        <Text className="text-on-surface font-body font-bold" style={{ fontSize: 16 }}>
                                                            {item.price.toFixed(2)}
                                                        </Text>
                                                    </View>
                                                </View>
                                                
                                                {isSplit && (
                                                    <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: 'rgba(219, 193, 186, 0.15)', paddingTop: 10 }}>
                                                        {[...new Set(item.assignedTo)].map((userId) => {
                                                            const u = users.find((usr: User) => usr.id === userId);
                                                            const count = item.assignedTo.filter(id => id === userId).length;
                                                            const userColor = getUserColor(userId);
                                                            
                                                            return (
                                                                <View key={userId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginRight: 12 }}>
                                                                    <View style={{ 
                                                                        width: 32, 
                                                                        height: 32, 
                                                                        borderRadius: 16, 
                                                                        backgroundColor: userColor.bg, 
                                                                        borderWidth: 1, 
                                                                        borderColor: userColor.border, 
                                                                        alignItems: 'center', 
                                                                        justifyContent: 'center', 
                                                                        shadowColor: '#000', 
                                                                        shadowOffset: { width: 0, height: 2 }, 
                                                                        shadowOpacity: 0.05, 
                                                                        shadowRadius: 3 
                                                                    }}>
                                                                        <Text style={{ fontWeight: '700', fontSize: 11, color: '#85341f', transform: [{ translateY: 1.0 }] }}>{u?.initials}</Text>
                                                                        {count > 1 && (
                                                                            <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#1c1c19', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#f6f3ee' }}>
                                                                                <Text style={{ color: 'white', fontSize: 7, fontWeight: 'bold' }}>{count}</Text>
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                )}
                                            </Pressable>
                                        </View>
                                    );
                                }}
                            />
                        </View>
                    </View>

                    {/* Bottom Action Bar */}
                    <View style={{ 
                        paddingBottom: Math.max(insets.bottom, 20), 
                        paddingTop: 20, 
                        paddingHorizontal: 24, 
                        backgroundColor: '#fcf9f4', 
                        position: 'absolute', 
                        bottom: 0, 
                        width: '100%', 
                        borderTopWidth: 1, 
                        borderTopColor: 'rgba(219, 193, 186, 0.2)',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.02,
                        shadowRadius: 10
                    }}>
                        <Pressable 
                            onPress={() => {
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                navigation.navigate('Result', { 
                                    items, 
                                    users, 
                                    tax: route.params.tax, 
                                    serviceCharge: route.params.serviceCharge, 
                                    tip: route.params.tip, 
                                    discount: route.params.discount,
                                    expectedSubtotal: route.params.expectedSubtotal,
                                    imageUri,
                                    restaurantName: route.params.restaurantName
                                });
                            }} 
                            style={({ pressed }) => ({
                                transform: [{ scale: pressed ? 0.98 : 1 }],
                                opacity: pressed ? 0.9 : 1
                            })}
                        >
                            <View 
                                style={{ 
                                    backgroundColor: '#85341f',
                                    paddingVertical: 18, 
                                    borderRadius: 30, 
                                    alignItems: 'center', 
                                    shadowColor: '#85341f', 
                                    shadowOffset: { width: 0, height: 6 }, 
                                    shadowOpacity: 0.25, 
                                    shadowRadius: 12,
                                    flexDirection: 'row',
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>Review & Send</Text>
                            </View>
                        </Pressable>
                    </View>

                    {/* Assignment Sheet UI - Compact Refined Design */}
                    {displayItemId && (
                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
                            <Pressable 
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} 
                                onPress={() => setSelectedItemId(null)}
                            >
                                <View style={{ flex: 1, backgroundColor: 'rgba(28, 28, 25, 0.4)' }} />
                            </Pressable>
                            
                            <View 
                                className="shadow-lg"
                                style={{ 
                                position: 'absolute', 
                                bottom: insets.bottom + 120, 
                                left: 16, 
                                right: 16, 
                                backgroundColor: '#fcf9f4', 
                                borderRadius: 36, 
                                paddingHorizontal: 20, 
                                paddingTop: 24,
                                paddingBottom: 32,
                                borderWidth: 1, 
                                borderColor: 'rgba(219, 193, 186, 0.5)',
                            }}>
                                {(() => {
                                    const activeItem = items.find(i => i.id === displayItemId);
                                    if (!activeItem) return null;
                                    return (
                                        <>
                                            <View style={{ width: '100%', alignItems: 'center', marginBottom: 30, position: 'relative' }}>
                                                <Text style={{ fontFamily: NEWSREADER_BOLD, fontSize: 22, color: '#85341f', textAlign: 'center' }}>Assign "{activeItem.name}"</Text>
                                                <Text style={{ fontSize: 10, color: '#aba9a2', marginTop: 6, fontWeight: '500' }}>Tap to add. Hold to remove.</Text>
                                                
                                                <TouchableOpacity 
                                                    onPress={() => setSelectedItemId(null)} 
                                                    style={{ 
                                                        position: 'absolute', 
                                                        top: -6, 
                                                        right: 0, 
                                                        width: 44, 
                                                        height: 44, 
                                                        alignItems: 'flex-end',
                                                        justifyContent: 'flex-start'
                                                    }}
                                                >
                                                    <X size={24} color="#1c1c19" strokeWidth={1.5} />
                                                </TouchableOpacity>
                                            </View>
                                            
                                            <View style={{ width: '100%' }}>
                                                <ScrollView 
                                                    horizontal 
                                                    showsHorizontalScrollIndicator={false} 
                                                    contentContainerStyle={{ 
                                                        gap: 12, 
                                                        paddingHorizontal: 4,
                                                        paddingBottom: 4,
                                                        alignItems: 'flex-start'
                                                    }}
                                                >
                                                    <View style={{ alignItems: 'center', width: 62 }}>
                                                        <Pressable 
                                                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); assignAll(); }} 
                                                            onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); removeAll(); }} 
                                                            style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.94 : 1 }] }]}
                                                        >
                                                            <View style={{ 
                                                                width: 50, 
                                                                height: 50, 
                                                                borderRadius: 25, 
                                                                backgroundColor: '#ffffff', 
                                                                borderColor: '#dbc1ba', 
                                                                borderWidth: 1.5, 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center', 
                                                                shadowColor: '#000', 
                                                                shadowOffset: { width: 0, height: 2 }, 
                                                                shadowOpacity: 0.1, 
                                                                shadowRadius: 4
                                                            }}>
                                                                <Users size={20} color="#85341f" />
                                                            </View>
                                                        </Pressable>
                                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1c1c19', marginTop: 10, textAlign: 'center', lineHeight: 13 }}>ALL</Text>
                                                    </View>
                                                    {users.map(user => {
                                                        const shares = activeItem.assignedTo.filter(id => id === user.id).length;
                                                        const userColor = getUserColor(user.id);

                                                        return (
                                                            <View key={user.id} style={{ alignItems: 'center', width: 62 }}>
                                                                <Pressable 
                                                                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); addOneAssignment(user.id); }} 
                                                                    onLongPress={() => { if (shares > 0) removeOneAssignment(user.id); }} 
                                                                    style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.94 : 1 }] }]}
                                                                >
                                                                    <View style={{ 
                                                                        width: 50, 
                                                                        height: 50, 
                                                                        borderRadius: 25, 
                                                                        backgroundColor: userColor.bg, 
                                                                        borderColor: shares > 0 ? '#85341f' : userColor.border, 
                                                                        borderWidth: shares > 0 ? 2 : 1.5, 
                                                                        alignItems: 'center', 
                                                                        justifyContent: 'center', 
                                                                        shadowColor: '#000', 
                                                                        shadowOffset: { width: 0, height: 2 }, 
                                                                        shadowOpacity: 0.08, 
                                                                        shadowRadius: 4
                                                                    }}>
                                                                        <Text style={{ fontWeight: '700', fontSize: 16, color: '#85341f', textAlign: 'center' }}>{user.initials}</Text>
                                                                        {shares > 1 && (
                                                                            <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#1c1c19', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fcf9f4' }}>
                                                                                <Text style={{ color: 'white', fontSize: 7, fontWeight: 'bold' }}>{shares}</Text>
                                                                            </View>
                                                                        )}
                                                                        {shares === 1 && (
                                                                            <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#85341f', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fcf9f4' }}>
                                                                                <Check size={8} color="white" />
                                                                            </View>
                                                                        )}
                                                                    </View>
                                                                </Pressable>
                                                                <Text style={{ fontSize: 11, color: '#1c1c19', marginTop: 10, fontWeight: '600', textAlign: 'center', lineHeight: 13 }} numberOfLines={2}>
                                                                    {user.name}
                                                                </Text>
                                                            </View>
                                                        );
                                                    })}
                                                </ScrollView>
                                            </View>
                                        </>
                                    );
                                })()}
                            </View>
                        </View>
                    )}

                    {/* Contact Modal */}
                    <Modal visible={isContactModalVisible} animationType="slide" presentationStyle="pageSheet">
                        <View style={{ flex: 1, backgroundColor: '#fcf9f4' }}>
                            <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                                <TouchableOpacity onPress={() => setContactModalVisible(false)}><Text style={{ color: '#85341f', fontSize: 18, fontWeight: '600' }}>Done</Text></TouchableOpacity>
                            </View>
                            <View style={{ paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f0ede4' }}>
                                <TouchableOpacity 
                                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isNewContactExpanded ? 16 : 0, paddingVertical: isNewContactExpanded ? 0 : 8 }}
                                    onPress={() => setIsNewContactExpanded(!isNewContactExpanded)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1c1c19' }}>New Contact</Text>
                                    {isNewContactExpanded ? <ChevronUp size={24} color="#85341f" /> : <ChevronDown size={24} color="#85341f" />}
                                </TouchableOpacity>
                                
                                {isNewContactExpanded && (
                                    <>
                                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                                <TextInput 
                                                    style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#dbc1ba' }} 
                                                    value={manualFirstName} 
                                                    onChangeText={setManualFirstName} 
                                                />
                                                {manualFirstName === '' && (
                                                    <View style={{ position: 'absolute', left: 12, flexDirection: 'row', pointerEvents: 'none' }}>
                                                        <Text style={{ color: '#a1a1aa', fontSize: 16 }}>First Name</Text>
                                                        <Text style={{ color: '#dc2626', fontSize: 16 }}> *</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                                <TextInput 
                                                    style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#dbc1ba' }} 
                                                    value={manualLastName} 
                                                    onChangeText={setManualLastName} 
                                                />
                                                {manualLastName === '' && (
                                                    <View style={{ position: 'absolute', left: 12, flexDirection: 'row', pointerEvents: 'none' }}>
                                                        <Text style={{ color: '#a1a1aa', fontSize: 16 }}>Last Name</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <View style={{ flex: 1, justifyContent: 'center' }}>
                                                <TextInput 
                                                    style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#dbc1ba' }} 
                                                    keyboardType="phone-pad"
                                                    value={manualPhone} 
                                                    onChangeText={setManualPhone} 
                                                />
                                                {manualPhone === '' && (
                                                    <View style={{ position: 'absolute', left: 12, flexDirection: 'row', pointerEvents: 'none' }}>
                                                        <Text style={{ color: '#a1a1aa', fontSize: 16 }}>Phone Number</Text>
                                                    </View>
                                                )}
                                            </View>
                                            <TouchableOpacity 
                                                style={{ backgroundColor: manualFirstName ? '#85341f' : '#dbc1ba', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' }}
                                                disabled={!manualFirstName}
                                                onPress={() => {
                                                    const newId = `manual_${Date.now()}`;
                                                    const newContact: User = {
                                                        id: newId,
                                                        name: `${manualFirstName} ${manualLastName}`.trim(),
                                                        initials: `${manualFirstName.charAt(0)}${manualLastName ? manualLastName.charAt(0) : ''}`.toUpperCase(),
                                                        phoneNumber: manualPhone || undefined
                                                    };
                                                    setContacts([newContact, ...contacts]);
                                                    toggleUser(newContact);
                                                    setManualFirstName('');
                                                    setManualLastName('');
                                                    setManualPhone('');
                                                    setIsNewContactExpanded(false);
                                                }}
                                            >
                                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Add</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}
                            </View>
                            <View style={{ padding: 16, paddingBottom: 8 }}>
                                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1c1c19', marginBottom: 12 }}>Select Contact</Text>
                                <TextInput style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#dbc1ba' }} placeholder="Search contacts" value={searchQuery} onChangeText={setSearchQuery} />
                            </View>
                            <FlatList
                                data={contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))}
                                keyExtractor={item => item.id}
                                contentContainerStyle={{ paddingHorizontal: 20 }}
                                renderItem={({ item }) => {
                                    const isSelected = users.some(u => u.id === item.id);
                                    return (
                                        <TouchableOpacity onPress={() => toggleUser(item)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0ede4' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isSelected ? '#85341f' : '#f0ede9', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                                    <Text style={{ color: isSelected ? 'white' : '#8c8c88', fontWeight: 'bold' }}>{item.initials}</Text>
                                                </View>
                                                <Text style={{ fontSize: 18, color: '#1c1c19' }}>{item.name}</Text>
                                            </View>
                                            {isSelected && <Check size={20} color="#85341f" />}
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        </View>
                    </Modal>
                </View>
            </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
    );
}
