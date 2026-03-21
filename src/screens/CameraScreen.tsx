import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Button } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Camera, Image, RotateCw } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';

export default function CameraScreen({ navigation, route }: any) {
    const [facing, setFacing] = useState<CameraType>('back');
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const insets = useSafeAreaInsets();
    const handleImageSelected = (uri: string) => {
        console.log("Image selected:", uri);
        navigation.navigate('BillConfirmation', { imageUri: uri });
    };

    const mode = route.params?.mode; // 'gallery' or undefined

    useEffect(() => {
        if (mode === 'gallery') {
            pickImage();
        }
    }, [mode]);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container} className="justify-center items-center bg-black">
                <Text style={styles.message} className="text-white text-center mb-4">We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    const toggleCameraFacing = () => {
        setFacing(current => (current === 'back' ? 'front' : 'back'));
    };

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.4,
                    base64: false
                });
                if (photo) {
                    handleImageSelected(photo.uri);
                }
            } catch (error) {
                console.error("Failed to take picture:", error);
            }
        }
    };

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.4,
        });

        if (!result.canceled) {
            handleImageSelected(result.assets[0].uri);
        } else {
            // If cancelled and was in gallery mode, maybe go back?
            if (mode === 'gallery') navigation.goBack();
        }
    };



    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
                <View className="flex-1 justify-between">
                    {/* Top Bar */}
                    <View style={{ paddingTop: insets.top + 10 }} className="flex-row justify-between px-4">
                        <TouchableOpacity onPress={() => navigation.goBack()} className="bg-black/40 p-2 rounded-full">
                            <X size={28} color="white" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={toggleCameraFacing} className="bg-black/40 p-2 rounded-full">
                            <RotateCw size={28} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Bottom Bar */}
                    <View style={{ paddingBottom: insets.bottom + 20 }} className="flex-row justify-around items-center px-6">
                        <TouchableOpacity onPress={pickImage} className="bg-black/40 p-4 rounded-full">
                            <Image size={24} color="white" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={takePicture}>
                            <View className="w-20 h-20 rounded-full border-4 border-white justify-center items-center">
                                <View className="w-16 h-16 rounded-full bg-white" />
                            </View>
                        </TouchableOpacity>

                        <View className="w-12" />
                    </View>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    camera: {
        flex: 1,
    },
});
