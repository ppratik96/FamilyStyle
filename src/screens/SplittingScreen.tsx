import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { ArrowLeft, Plus, User as UserIcon, Send, X } from 'lucide-react-native';
import * as SMS from 'expo-sms';
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { BillItem, User } from '../types';
import { getContacts, getContactFrequencies, incrementContactFrequency } from '../services/contactsService';
import ReceiptViewer from '../components/ReceiptViewer';

export default function SplittingScreen({ navigation, route }: any) {
    const { items: initialItems, imageUri } = route.params;
    const insets = useSafeAreaInsets();

    const [items, setItems] = useState<BillItem[]>(initialItems.filter((i: BillItem) => !i.isGroup));
    const [users, setUsers] = useState<User[]>([{ id: 'me', name: 'Me', initials: 'ME' }]);
    const [selectedItem, setSelectedItem] = useState<BillItem | null>(null);
    const [isContactModalVisible, setContactModalVisible] = useState(false);
    const [contacts, setContacts] = useState<User[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Calculate totals
    const getUserTotal = (userId: string) => {
        return items.reduce((total, item) => {
            const userShares = item.assignedTo.filter(id => id === userId).length;
            if (userShares > 0) {
                return total + ((item.price / item.assignedTo.length) * userShares);
            }
            return total;
        }, 0);
    };

    const addAssignment = (userId: string) => {
        if (!selectedItem) return;
        const updatedItems = items.map(item => {
            if (item.id === selectedItem.id) {
                return { ...item, assignedTo: [...item.assignedTo, userId] };
            }
            return item;
        });
        setItems(updatedItems);
        setSelectedItem(updatedItems.find(i => i.id === selectedItem.id) || null);
    };

    const removeAssignment = (userId: string) => {
        if (!selectedItem) return;
        const updatedItems = items.map(item => {
            if (item.id === selectedItem.id) {
                // Remove all instances of userId
                return { ...item, assignedTo: item.assignedTo.filter(id => id !== userId) };
            }
            return item;
        });
        setItems(updatedItems);
        setSelectedItem(updatedItems.find(i => i.id === selectedItem.id) || null);
    };
    
    // Kept for backward compatibility if needed, but we use add/remove now
    const toggleAssignment = (userId: string) => {
        const userShares = selectedItem?.assignedTo.filter(id => id === userId).length || 0;
        if (userShares > 0) {
            removeAssignment(userId);
        } else {
            addAssignment(userId);
        }
    };

    const fetchContacts = async () => {
        setLoadingContacts(true);
        const [fetchedContacts, freqs] = await Promise.all([
            getContacts(),
            getContactFrequencies()
        ]);
        
        fetchedContacts.sort((a, b) => {
            const freqA = freqs[a.id] || 0;
            const freqB = freqs[b.id] || 0;
            if (freqA !== freqB) {
                return freqB - freqA; // High to low
            }
            return a.name.localeCompare(b.name);
        });

        setContacts(fetchedContacts);
        setLoadingContacts(false);
    };

    const addUser = (user: User) => {
        if (!users.find(u => u.id === user.id)) {
            setUsers([...users, user]);
        }
        incrementContactFrequency(user.id);
        setContactModalVisible(false);
    };

    const sendRequest = async (user: User) => {
        const total = getUserTotal(user.id);
        if (total <= 0 || !user.phoneNumber) return;

        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            await SMS.sendSMSAsync(
                [user.phoneNumber],
                `Hey ${user.name}, your share of the bill is $${total.toFixed(2)}.`
            );
        } else {
            alert(`SMS is not available. Owed: $${total.toFixed(2)}`);
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
                        <Text className="text-white text-xl font-bold">Split Bill</Text>
                        <TouchableOpacity onPress={() => {
                            fetchContacts();
                            setContactModalVisible(true);
                        }} className="p-2 bg-blue-600 rounded-full">
                            <Plus size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                    {/* Receipt Viewer */}
                    <ReceiptViewer imageUri={imageUri} topOffset={70} />

                    {/* Users ScrollView (Horizontal) */}
                    <View className="py-4 border-b border-white/10">
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-4">
                            {users.map((user, index) => (
                                <Animated.View
                                    entering={FadeInDown.delay(index * 100)}
                                    key={user.id}
                                    style={{ alignItems: 'center', marginRight: 24 }}
                                >
                                    <View className="w-16 h-16 rounded-full bg-gray-700 justify-center items-center mb-2 border-2 border-white/20">
                                        <Text className="text-white font-bold">{user.initials}</Text>
                                    </View>
                                    <Text className="text-white text-xs">{user.name}</Text>
                                    <Text className="text-green-400 text-xs font-bold">${getUserTotal(user.id).toFixed(2)}</Text>
                                </Animated.View>
                            ))}
                        </ScrollView>
                    </View>

                    {/* Items List */}
                    <ScrollView className="flex-1 px-4 mt-4">
                        {items.map((item, index) => (
                            <Animated.View entering={FadeInDown.delay(index * 50)} key={item.id} style={{ marginBottom: 12 }}>
                                <TouchableOpacity
                                    onPress={() => setSelectedItem(item)}
                                    className={`flex-row justify-between items-center p-4 rounded-2xl ${selectedItem?.id === item.id ? 'bg-blue-900/50 border border-blue-500' : 'bg-white/10 border border-white/5'}`}
                                >
                                    <View className="flex-1">
                                        <Text className="text-white text-lg font-medium">{item.name}</Text>
                                        <View className="flex-row mt-2 flex-wrap">
                                            {item.assignedTo.length === 0 && <Text className="text-gray-400 text-xs italic">Unassigned</Text>}
                                            {
                                                // Group assigned user IDs and count shares
                                                Object.entries(item.assignedTo.reduce((acc: any, id) => {
                                                    acc[id] = (acc[id] || 0) + 1;
                                                    return acc;
                                                }, {})).map(([userId, count]) => {
                                                    const u = users.find((usr: User) => usr.id === userId);
                                                    return (
                                                        <View key={userId} className="bg-gray-700 px-2 py-1 rounded-md mr-1 mb-1 flex-row items-center">
                                                            <Text className="text-xs text-white">{u?.initials}</Text>
                                                            {(count as number) > 1 && <Text className="text-xs text-blue-300 ml-1 font-bold">x{count as number}</Text>}
                                                        </View>
                                                    );
                                                })
                                            }
                                        </View>
                                    </View>
                                    <Text className="text-white text-lg font-bold">${item.price.toFixed(2)}</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ))}
                    </ScrollView>

                    {/* Bottom Assignment Sheet (visible when item selected) */}
                    {selectedItem && (
                        <Animated.View
                            entering={SlideInDown}
                            exiting={SlideOutDown}
                            style={{
                                position: 'absolute',
                                bottom: insets.bottom + 80, // Position above the button
                                width: '100%',
                                zIndex: 50, // Ensure it sits above
                            }}
                        >
                            <View className="bg-gray-900/95 border border-white/10 p-4 rounded-3xl mx-4 self-center shadow-lg">
                                <View className="flex-row justify-between items-center mb-2">
                                    <Text className="text-white text-xl font-bold">Assign "{selectedItem.name}"</Text>
                                    <TouchableOpacity onPress={() => setSelectedItem(null)}>
                                        <X size={24} color="gray" />
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-gray-400 text-xs mb-4 text-center">Tap to add share. Hold to remove.</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {users.map(user => {
                                        const userShares = selectedItem.assignedTo.filter(id => id === user.id).length;
                                        const isSelected = userShares > 0;
                                        return (
                                            <TouchableOpacity
                                                key={user.id}
                                                onPress={() => addAssignment(user.id)}
                                                onLongPress={() => removeAssignment(user.id)}
                                                delayLongPress={300}
                                                className={`mr-4 items-center p-2 rounded-xl border ${isSelected ? 'bg-blue-600 border-blue-400' : 'bg-transparent border-gray-600'}`}
                                            >
                                                <View className="relative mb-1">
                                                    <View className="w-12 h-12 rounded-full bg-gray-700 justify-center items-center">
                                                        <Text className="text-white">{user.initials}</Text>
                                                    </View>
                                                    {userShares > 1 && (
                                                        <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-6 h-6 justify-center items-center shadow border border-red-800" style={{ elevation: 5, zIndex: 10 }}>
                                                            <Text className="text-white text-xs font-bold">{userShares}</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text className="text-white text-xs">{user.name}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        </Animated.View>
                    )}

                    {/* Contacts Modal */}
                    <Modal visible={isContactModalVisible} animationType="slide" presentationStyle="pageSheet">
                        <View className="flex-1 bg-gray-900">
                            <View className="p-4 flex-row justify-between items-center border-b border-white/10">
                                <Text className="text-white text-xl font-bold">Select Contact</Text>
                                <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                                    <Text className="text-blue-400 text-lg">Close</Text>
                                </TouchableOpacity>
                            </View>
                            {loadingContacts ? (
                                <View className="flex-1 justify-center items-center">
                                    <ActivityIndicator size="large" color="white" />
                                    <Text className="text-white mt-4">Loading contacts...</Text>
                                </View>
                            ) : (
                                <View className="flex-1">
                                    <View className="px-4 py-2 bg-gray-900 border-b border-white/10">
                                        <View className="flex-row items-center bg-gray-800 rounded-xl px-3 py-2">
                                            <TextInput
                                                className="flex-1 text-white text-base ml-2"
                                                placeholder="Search"
                                                placeholderTextColor="#9ca3af"
                                                value={searchQuery}
                                                onChangeText={setSearchQuery}
                                                autoCorrect={false}
                                            />
                                            {searchQuery.length > 0 && (
                                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                                    <X size={16} color="#9ca3af" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                    <FlatList
                                        data={contacts.filter(c =>
                                            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            (c.phoneNumber && c.phoneNumber.includes(searchQuery))
                                        )}
                                        keyExtractor={item => item.id}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity onPress={() => addUser(item)} className="p-4 border-b border-white/10 flex-row items-center">
                                                <View className="w-10 h-10 rounded-full bg-gray-700 justify-center items-center mr-4">
                                                    <Text className="text-white">{item.initials}</Text>
                                                </View>
                                                <View>
                                                    <Text className="text-white font-bold">{item.name}</Text>
                                                    {item.phoneNumber && (
                                                        <Text className="text-gray-400 text-sm">{item.phoneNumber}</Text>
                                                    )}
                                                </View>
                                            </TouchableOpacity>
                                        )}
                                        ListEmptyComponent={
                                            <View className="p-8 items-center">
                                                <Text className="text-gray-500">No contacts found</Text>
                                            </View>
                                        }
                                    />
                                </View>
                            )}
                        </View>
                    </Modal>

                    {/* Bottom Action Button - Always Visible */}
                    <Animated.View
                        entering={FadeInDown.delay(300)}
                        style={{
                            paddingBottom: insets.bottom + 20,
                            position: 'absolute',
                            bottom: 0,
                            width: '100%',
                            paddingHorizontal: 24,
                            paddingTop: 16,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            borderTopWidth: 1,
                            borderColor: 'rgba(255,255,255,0.1)',
                        }}
                    >
                        {/* Only show if items are processed (optional check) */}
                        <TouchableOpacity
                            onPress={() => navigation.navigate('Result', { items, users, tax: route.params.tax, serviceCharge: route.params.serviceCharge, tip: route.params.tip, imageUri })}
                            className="bg-blue-600 p-4 rounded-2xl flex-row justify-center items-center shadow-lg shadow-blue-500/30"
                        >
                            <Text className="text-white text-lg font-bold mr-2">Review & Send</Text>
                            <ArrowLeft size={20} color="white" style={{ transform: [{ rotate: '180deg' }] }} />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </BlurView>
        </View>
    );
}

