import React, { useState } from 'react';
import { View, Image, TouchableOpacity, Modal, Text, StyleSheet, Dimensions } from 'react-native';
import { X, ZoomIn } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ReceiptViewerProps {
    imageUri: string;
    topOffset?: number;
}

const { width, height } = Dimensions.get('window');

export default function ReceiptViewer({ imageUri, topOffset = 10 }: ReceiptViewerProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const insets = useSafeAreaInsets();

    if (!imageUri) return null;

    return (
        <>
            {/* Wrapper to position absolute top-right */}
            <Animated.View
                entering={FadeIn.delay(500)}
                style={{
                    position: 'absolute',
                    top: insets.top + topOffset,
                    right: 16,
                    zIndex: 50
                }}
            >
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="overflow-hidden rounded-xl border-2 border-white/20 shadow-lg bg-black"
                    style={{ width: 60, height: 80 }}
                >
                    <Image
                        source={{ uri: imageUri }}
                        className="w-full h-full opacity-80"
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/20 justify-center items-center">
                        <ZoomIn size={20} color="white" opacity={0.8} />
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {/* Full Screen Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View className="flex-1 bg-black/90">
                    <BlurView intensity={20} tint="dark" className="flex-1 justify-center items-center">
                        <TouchableOpacity
                            style={{ position: 'absolute', top: insets.top + 20, right: 20, zIndex: 100 }}
                            onPress={() => setModalVisible(false)}
                            className="bg-gray-800/80 p-2 rounded-full"
                        >
                            <X size={24} color="white" />
                        </TouchableOpacity>

                        <Image
                            source={{ uri: imageUri }}
                            style={{ width: width, height: height * 0.8 }}
                            resizeMode="contain"
                        />
                        <Text className="text-white mt-4 font-medium opacity-70">Pinch to zoom (native)</Text>
                    </BlurView>
                </View>
            </Modal>
        </>
    );
}
