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
            {/* Thumbnail Wrapper */}
            <View>
                <TouchableOpacity
                    onPress={() => setModalVisible(true)}
                    className="overflow-hidden rounded-md border-2 border-[#E5CDC1] bg-white shadow-sm"
                    style={{ width: 44, height: 56 }}
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
                <View className="flex-1 bg-white/80">
                    <BlurView intensity={40} tint="light" className="flex-1 justify-center items-center">
                        <TouchableOpacity
                            style={{ position: 'absolute', top: insets.top + 20, right: 20, zIndex: 100 }}
                            onPress={() => setModalVisible(false)}
                            className="bg-white p-3 border border-[#E5CDC1] shadow-md rounded-full"
                        >
                            <X size={24} color="#A64932" />
                        </TouchableOpacity>

                        <View className="bg-white rounded-2xl shadow-xl overflow-hidden border border-[#E5CDC1]" style={{ width: width * 0.9, height: height * 0.75 }}>
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
