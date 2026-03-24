import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, ViewProps, StyleProp, ViewStyle } from 'react-native';

interface AnimatedButtonProps extends ViewProps {
    onPress?: () => void;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    activeScale?: number;
    disabled?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
    onPress, 
    children, 
    style, 
    activeScale = 0.96,
    disabled = false,
    ...props 
}) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, {
            toValue: activeScale,
            useNativeDriver: true,
            friction: 4,
            tension: 40
        }).start();
    };

    const handlePressOut = () => {
        if (disabled) return;
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 4,
            tension: 40
        }).start();
    };

    return (
        <TouchableWithoutFeedback
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
        >
            <Animated.View 
                style={[
                    style, 
                    { transform: [{ scale: scaleAnim }] }
                ]}
                {...props}
            >
                {children}
            </Animated.View>
        </TouchableWithoutFeedback>
    );
};
