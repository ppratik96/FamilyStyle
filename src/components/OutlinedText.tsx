import React from 'react';
import { View, Text, TextProps, StyleSheet } from 'react-native';

interface OutlinedTextProps extends TextProps {
    outlineColor?: string;
    strokeWidth?: number;
    children: React.ReactNode;
}

export const OutlinedText: React.FC<OutlinedTextProps> = ({ 
    outlineColor = 'white', 
    strokeWidth = 1, 
    style, 
    children, 
    ...props 
}) => {
    if (outlineColor === 'transparent') {
        return <Text style={style} {...props}>{children}</Text>;
    }

    return (
        <View style={{ position: 'relative', flexDirection: 'row' }}>
            <Text style={[style, { color: outlineColor, position: 'absolute', transform: [{ translateX: -strokeWidth }, { translateY: -strokeWidth }] }]} {...props}>{children}</Text>
            <Text style={[style, { color: outlineColor, position: 'absolute', transform: [{ translateX: strokeWidth }, { translateY: -strokeWidth }] }]} {...props}>{children}</Text>
            <Text style={[style, { color: outlineColor, position: 'absolute', transform: [{ translateX: -strokeWidth }, { translateY: strokeWidth }] }]} {...props}>{children}</Text>
            <Text style={[style, { color: outlineColor, position: 'absolute', transform: [{ translateX: strokeWidth }, { translateY: strokeWidth }] }]} {...props}>{children}</Text>
            
            <Text style={[style, { color: outlineColor, position: 'absolute', transform: [{ translateX: 0 }, { translateY: -strokeWidth }] }]} {...props}>{children}</Text>
            <Text style={[style, { color: outlineColor, position: 'absolute', transform: [{ translateX: 0 }, { translateY: strokeWidth }] }]} {...props}>{children}</Text>
            <Text style={[style, { color: outlineColor, position: 'absolute', transform: [{ translateX: -strokeWidth }, { translateY: 0 }] }]} {...props}>{children}</Text>
            <Text style={[style, { color: outlineColor, position: 'absolute', transform: [{ translateX: strokeWidth }, { translateY: 0 }] }]} {...props}>{children}</Text>
            
            <Text style={style} {...props}>{children}</Text>
        </View>
    );
};
