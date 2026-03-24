import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';

interface SkeletonProps {
    width?: number | string;
    height?: number | string;
    borderRadius?: number;
    style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
    width = '100%', 
    height = 20, 
    borderRadius = 8,
    style 
}) => {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const translateX = useRef(new Animated.Value(-1)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(translateX, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, []);

    const animatedStyle = {
        transform: [
            {
                translateX: translateX.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-400, 400],
                }),
            },
        ],
    };

    const gradientColors = isDark
        ? ['transparent', 'rgba(255,255,255,0.3)', 'transparent']
        : ['transparent', 'rgba(0,0,0,0.1)', 'transparent'];

    return (
        <View 
            style={[
                { 
                    width: width as any, 
                    height: height as any, 
                    borderRadius, 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', 
                    overflow: 'hidden' 
                },
                style
            ]}
        >
            <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
                <LinearGradient
                    colors={gradientColors as any}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
        </View>
    );
};

export const SkeletonCircle: React.FC<{ size: number; style?: ViewStyle }> = ({ size, style }) => (
    <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />
);

export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
    <View style={[{ padding: 20, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 16 }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <SkeletonCircle size={50} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
                <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
                <Skeleton width="40%" height={8} />
            </View>
        </View>
        <Skeleton width="100%" height={100} borderRadius={16} />
    </View>
);
