import React from "react";
import { View, Text, TouchableOpacity, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { BlurView } from "expo-blur";
import { Camera, Upload, Coins } from "lucide-react-native";

import * as ImagePicker from 'expo-image-picker';

export default function HomeScreen({ navigation }: any) {
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.4,
        });

        if (!result.canceled) {
            navigation.navigate('BillConfirmation', { imageUri: result.assets[0].uri });
        }
    };

    return (
        <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=3023&auto=format&fit=crop" }}
            style={{ flex: 1 }}
            resizeMode="cover"
        >
            <View className="flex-1 bg-black/40">
                <SafeAreaView className="flex-1 px-6 justify-between py-10">
                    <StatusBar style="light" />

                    <View className="mt-10">
                        <View className="flex-row items-center space-x-2 mb-2">
                            <Coins size={32} color="#fff" />
                            <Text className="text-white text-4xl font-bold tracking-wider">
                                BillSplitter
                            </Text>
                        </View>
                        <Text className="text-gray-300 text-lg font-medium">
                            Effortless bill splitting with friends.
                        </Text>
                    </View>

                    <View className="space-y-6">
                        <BlurView intensity={30} tint="light" className="overflow-hidden rounded-2xl border border-white/20">
                            <TouchableOpacity
                                className="p-6 flex-row items-center space-x-4 active:bg-white/10"
                                onPress={() => navigation.navigate("Camera")}
                            >
                                <View className="bg-white/20 p-4 rounded-full">
                                    <Camera size={32} color="#fff" />
                                </View>
                                <View className="flex-1 ml-4">
                                    <Text className="text-white text-xl font-bold">Take Photo</Text>
                                    <Text className="text-gray-200 text-sm">Snap a picture of your receipt</Text>
                                </View>
                            </TouchableOpacity>
                        </BlurView>

                        <BlurView intensity={30} tint="light" className="overflow-hidden rounded-2xl border border-white/20">
                            <TouchableOpacity
                                className="p-6 flex-row items-center space-x-4 active:bg-white/10"
                                onPress={pickImage}
                            >
                                <View className="bg-white/20 p-4 rounded-full">
                                    <Upload size={32} color="#fff" />
                                </View>
                                <View className="flex-1 ml-4">
                                    <Text className="text-white text-xl font-bold">Upload Image</Text>
                                    <Text className="text-gray-200 text-sm">Select from your gallery</Text>
                                </View>
                            </TouchableOpacity>
                        </BlurView>
                    </View>

                    <View className="items-center">
                        <Text className="text-white/50 text-xs">Designed with Liquid Glass UI</Text>
                    </View>
                </SafeAreaView>
            </View>
        </ImageBackground>
    );
}
