import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

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
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    mode: 'light',
    colors: lightColors,
    isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useColorScheme();
    const mode: ThemeMode = systemColorScheme === 'dark' ? 'dark' : 'light';

    const value = useMemo(() => ({
        mode,
        colors: mode === 'dark' ? darkColors : lightColors,
        isDark: mode === 'dark',
    }), [mode]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
