import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = '@family_style_theme_mode';

const lightColors = {
    primary: '#85341f',
    onPrimary: '#ffffff',
    background: '#fcf9f4',
    surface: '#ffffff',
    onSurface: '#1c1c19',
    onSurfaceVariant: '#55423e',
    outlineVariant: '#dbc1ba',
    surfaceContainerLow: '#f6f3ee',
    separator: '#f0ede4',
    muted: '#aba9a2',
    error: '#dc2626',
    errorBg: '#fef2f2',
    errorBorder: '#fecaca',
    success: '#15803d',
};

const darkColors = {
    primary: '#85341f',
    onPrimary: '#ffffff',
    background: '#1c1514',
    surface: '#2b2220',
    onSurface: '#ede0de',
    onSurfaceVariant: '#d8c2be',
    outlineVariant: '#534340',
    surfaceContainerLow: '#352a28',
    separator: '#3d3230',
    muted: '#8a7e7b',
    error: '#f87171',
    errorBg: '#3b1111',
    errorBorder: '#5c1e1e',
    success: '#4ade80',
};

interface ThemeContextType {
    mode: ThemeMode;
    colors: typeof lightColors;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    colors: lightColors,
    toggleTheme: () => {},
    isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>('light');

    // Load saved theme on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme === 'light' || savedTheme === 'dark') {
                    setMode(savedTheme);
                }
            } catch (error) {
                console.error('Failed to load theme:', error);
            }
        };
        loadTheme();
    }, []);

    const toggleTheme = async () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newMode);
        } catch (error) {
            console.error('Failed to save theme:', error);
        }
    };

    const value = useMemo(() => ({
        mode,
        colors: mode === 'dark' ? darkColors : lightColors,
        toggleTheme,
        isDark: mode === 'dark',
    }), [mode, toggleTheme]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
