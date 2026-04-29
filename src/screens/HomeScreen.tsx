import React from "react";
import { View, Text, TouchableOpacity, Image, Dimensions, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Camera, Upload, Moon, Sun, History } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { OutlinedText } from '../components/OutlinedText';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
    const { colors, toggleTheme, isDark } = useTheme();

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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            <View style={styles.content}>
                {/* Centered Logo & Theme Toggle */}
                <SafeAreaView edges={['top']} style={styles.header}>
                    <View style={styles.headerLeftContainer}>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate("History")}
                            style={[styles.toggleButton, { 
                                backgroundColor: colors.surfaceContainerLow,
                                borderColor: colors.outlineVariant + '4D',
                                marginRight: 10
                            }]}
                        >
                            <History size={18} color={colors.onSurfaceVariant} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.logoContainer}>
                        <OutlinedText 
                            style={[styles.logoText, { color: isDark ? 'white' : colors.primary }]}
                            outlineColor="transparent"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            {"FamilyStyle "}
                        </OutlinedText>
                    </View>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            onPress={toggleTheme}
                            style={[styles.toggleButton, {
                                backgroundColor: colors.surfaceContainerLow,
                                borderColor: colors.outlineVariant + '4D',
                            }]}
                        >
                            {isDark ? (
                                <Sun size={20} color={colors.onSurfaceVariant} />
                            ) : (
                                <Moon size={20} color={colors.primary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Hero Section: Full Width Fade */}
                <View style={styles.heroWrapper}>
                    <View style={{ width: width, height: width * 1.05 }}>
                        <Image
                            source={require('../../assets/dining-hero.jpg')}
                            style={styles.heroImage}
                        />
                        {/* Top-down fade for logo visibility */}
                        <LinearGradient
                            colors={[
                                colors.background,
                                colors.background + 'B3',
                                'transparent'
                            ]}
                            locations={[0, 0.3, 0.6]}
                            style={styles.gradientOverlay}
                            pointerEvents="none"
                        />
                        {/* Bottom-up fade to background */}
                        <LinearGradient
                            colors={[
                                'transparent',
                                colors.background + '33',
                                colors.background + 'CC',
                                colors.background
                            ]}
                            locations={[0.5, 0.7, 0.9, 1]}
                            style={styles.gradientOverlay}
                            pointerEvents="none"
                        />
                    </View>
                </View>

                {/* Headline & Copy */}
                <View style={styles.headlineContainer}>
                    <Text style={[styles.headlineText, { color: colors.onSurface }]}>
                        Pass the plate,
                    </Text>
                    <OutlinedText
                        style={[styles.headlineText, styles.headlineItalic, { color: isDark ? 'white' : colors.primary }]}
                        outlineColor="transparent"
                        strokeWidth={1}
                    >
                        not the bill.
                    </OutlinedText>
                    <Text style={[styles.subtitleText, { color: colors.onSurfaceVariant }]}>
                        For shared meals too good{"\n"}to ruin with math.
                    </Text>
                </View>

                {/* Primary Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                        onPress={() => navigation.navigate("Camera")}
                        activeOpacity={0.8}
                    >
                        <Camera size={20} color={colors.onPrimary} strokeWidth={2.5} />
                        <Text style={[styles.buttonText, { color: colors.onPrimary }]}>
                            Scan Receipt
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, {
                            backgroundColor: colors.surfaceContainerLow,
                            borderColor: colors.outlineVariant + '66',
                        }]}
                        onPress={pickImage}
                        activeOpacity={0.8}
                    >
                        <Upload size={20} color={colors.onSurface} strokeWidth={2.5} />
                        <Text style={[styles.buttonText, { color: colors.onSurface }]}>
                            Upload Receipt
                        </Text>
                    </TouchableOpacity>

                    {/* Subtle Branding Element */}
                    <View style={styles.brandingRow}>
                        <View style={[styles.brandingLine, { backgroundColor: colors.onSurface + '33' }]} />
                        <Text style={[styles.brandingText, { color: colors.onSurface }]}>
                            FAMILYSTYLE
                        </Text>
                        <View style={[styles.brandingLine, { backgroundColor: colors.onSurface + '33' }]} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
    },
    header: {
        zIndex: 20,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    headerSpacer: {
        flex: 1,
    },
    headerLeftContainer: {
        flex: 1,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    logoContainer: {
        flex: 3,
        alignItems: 'center',
    },
    logoText: {
        fontFamily: 'Newsreader_700Bold_Italic',
        fontSize: 48,
        letterSpacing: -2,
    },
    toggleContainer: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    toggleButton: {
        padding: 8,
        borderRadius: 999,
        borderWidth: 1,
    },
    heroWrapper: {
        position: 'relative',
        width: '100%',
        marginTop: -48,
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    gradientOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    headlineContainer: {
        paddingHorizontal: 40,
        zIndex: 10,
        alignItems: 'center',
        marginTop: -8,
    },
    headlineText: {
        fontFamily: 'Newsreader_700Bold',
        fontSize: 44,
        lineHeight: 46,
        textAlign: 'center',
        letterSpacing: -2,
    },
    headlineItalic: {
        fontFamily: 'Newsreader_700Bold_Italic',
    },
    subtitleText: {
        fontFamily: 'Newsreader_700Bold_Italic',
        fontSize: 18,
        lineHeight: 24,
        textAlign: 'center',
        maxWidth: 280,
        marginTop: 16,
        opacity: 0.9,
    },
    actionsContainer: {
        width: '100%',
        paddingHorizontal: 32,
        marginTop: 'auto',
        paddingBottom: 32,
        gap: 16,
    },
    primaryButton: {
        width: '100%',
        paddingVertical: 20,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButton: {
        width: '100%',
        paddingVertical: 20,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontWeight: '700',
        fontSize: 15,
        marginLeft: 12,
        letterSpacing: -0.3,
    },
    brandingRow: {
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        opacity: 0.4,
    },
    brandingLine: {
        height: 1,
        flex: 1,
    },
    brandingText: {
        fontFamily: 'Newsreader_700Bold_Italic',
        fontSize: 10,
        letterSpacing: 3,
        marginHorizontal: 16,
    },
});
