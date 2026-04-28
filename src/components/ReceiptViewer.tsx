import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Modal, Text, StyleSheet, Dimensions } from 'react-native';
import { X, ZoomIn } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';

interface ReceiptViewerProps {
    imageUri: string;
    topOffset?: number;
}

const { width, height } = Dimensions.get('window');

export default function ReceiptViewer({ imageUri, topOffset = 10 }: ReceiptViewerProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();

    if (!imageUri) return null;

    return (
        <>
            {/* Thumbnail Wrapper */}
            <View>
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="overflow-hidden rounded-md border-2 shadow-sm"
                    style={{ width: 44, height: 56, borderColor: colors.outlineVariant, backgroundColor: colors.surface }}
                >
                    <Image
                        source={{ uri: imageUri }}
                        className="w-full h-full opacity-90"
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/10 justify-center items-center">
                        <ZoomIn size={18} color="white" opacity={0.9} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Full Screen Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)' }}>
                    <BlurView intensity={40} tint={isDark ? "dark" : "light"} className="flex-1 justify-center items-center">
                        <TouchableOpacity
                            style={{ position: 'absolute', top: insets.top + 20, right: 20, zIndex: 100, backgroundColor: colors.surface, borderColor: colors.outlineVariant }}
                            onPress={() => setModalVisible(false)}
                            className="p-3 border shadow-md rounded-full"
                        >
                            <X size={24} color={isDark ? 'white' : colors.primary} />
                        </TouchableOpacity>

                        <View className="rounded-2xl shadow-xl overflow-hidden border" style={{ width: width * 0.9, height: height * 0.75, backgroundColor: colors.surface, borderColor: colors.outlineVariant }}>
                            <Image
                                source={{ uri: imageUri }}
                                className="w-full h-full"
                                resizeMode="cover"
                            />
                        </View>
                    </BlurView>
                </View>
            </Modal>
        </>
    );
}
