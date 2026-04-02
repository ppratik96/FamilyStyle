import React from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Camera, Upload } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: false,
            quality: 0.4,
        });

        if (!result.canceled) {
            navigation.navigate('BillConfirmation', { imageUri: result.assets[0].uri });
        }
    };

    return (
        <View className="flex-1 bg-background">
            <StatusBar style="dark" />
            
            <View className="flex-1 items-center">
                {/* Centered Logo */}
                <SafeAreaView edges={['top']} className="z-20 w-full">
                    <View className="pt-8 pb-4 items-center w-full">
                        <Text className="font-headline-italic text-[48px] text-primary tracking-tighter">
                            FamilyStyle
                        </Text>
                    </View>
                </SafeAreaView>

                {/* Hero Section: Full Width Fade */}
                <View className="relative w-full -mt-12 overflow-hidden">
                    <View style={{ width: width, height: width * 1.05 }}>
                        <Image 
                            source={require('../../assets/dining-hero.jpg')} 
                            className="w-full h-full"
                            style={{ resizeMode: 'cover' }}
                        />
                        {/* Top-down fade for logo visibility */}
                        <LinearGradient
                            colors={['#fcf9f4', 'rgba(252, 249, 244, 0.7)', 'transparent']}
                            locations={[0, 0.3, 0.6]}
                            style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '100.5%' }}
                            pointerEvents="none"
                        />
                        {/* Bottom-up fade to background */}
                        <LinearGradient
                            colors={['transparent', 'rgba(252, 249, 244, 0.2)', 'rgba(252, 249, 244, 0.8)', '#fcf9f4']}
                            locations={[0.5, 0.7, 0.9, 1]}
                            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '100.5%' }}
                            pointerEvents="none"
                        />
                    </View>
                </View>

                {/* Headline & Copy */}
                <View className="text-center px-10 z-10 items-center -mt-2">
                    <Text className="font-headline text-[44px] leading-[46px] text-on-surface text-center tracking-tighter">
                        Pass the plate,
                    </Text>
                    <Text className="font-headline-italic text-[44px] leading-[46px] text-primary text-center tracking-tighter">
                        not the bill.
                    </Text>
                    <Text className="font-headline-italic text-[18px] text-on-surface-variant/90 leading-snug max-w-[280px] text-center mt-4">
                        For shared meals too good{"\n"}to ruin with math.
                    </Text>
                </View>

                {/* Primary Actions */}
                <View className="w-full px-8 mt-auto pb-8 gap-y-4">
                    <TouchableOpacity 
                        className="w-full bg-primary py-5 rounded-2xl shadow-md flex-row items-center justify-center active:opacity-90"
                        onPress={() => navigation.navigate("Camera")}
                        activeOpacity={0.8}
                    >
                        <Camera size={20} color="white" strokeWidth={2.5} />
                        <Text className="text-white font-body-bold tracking-tight text-[15px] ml-3">
                            Scan Receipt
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        className="w-full bg-white py-5 rounded-2xl border border-outline-variant/40 shadow-sm flex-row items-center justify-center active:opacity-90"
                        onPress={pickImage}
                        activeOpacity={0.8}
                    >
                        <Upload size={20} color="#1c1c19" strokeWidth={2.5} />
                        <Text className="text-on-surface font-body-bold tracking-tight text-[15px] ml-3">
                            Upload Receipt
                        </Text>
                    </TouchableOpacity>

                    {/* Subtle Branding Element */}
                    <View className="mt-6 flex-row items-center justify-center space-x-4 opacity-40 px-4">
                        <View className="h-[1px] flex-1 bg-on-surface/20" />
                        <Text className="font-headline-italic text-[10px] tracking-[0.25em] uppercase text-on-surface mx-4">
                            FamilyStyle
                        </Text>
                        <View className="h-[1px] flex-1 bg-on-surface/20" />
                    </View>
                </View>
            </View>
        </View>
    );
}
