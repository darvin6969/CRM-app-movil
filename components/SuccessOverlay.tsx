import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Modal } from 'react-native';
import { CheckCircle2, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

interface SuccessOverlayProps {
    visible: boolean;
    message: string;
    onClose: () => void;
    isDark: boolean;
}

export const SuccessOverlay: React.FC<SuccessOverlayProps> = ({ visible, message, onClose, isDark }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();

            const timer = setTimeout(() => {
                hide();
            }, 2500);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    const hide = () => {
        Animated.parallel([
            Animated.timing(scaleAnim, {
                toValue: 0.8,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start(() => {
            onClose();
        });
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View className="flex-1 items-center justify-center px-10">
                <BlurView 
                    intensity={isDark ? 40 : 80} 
                    tint={isDark ? "dark" : "light"} 
                    className="absolute inset-0"
                />
                
                <Animated.View 
                    style={{ 
                        transform: [{ scale: scaleAnim }], 
                        opacity: opacityAnim,
                        alignItems: 'center'
                    }}
                >
                    <View className="bg-green-500 p-8 rounded-[40px] shadow-2xl shadow-green-500/40 mb-6">
                        <CheckCircle2 color="white" size={60} />
                    </View>
                    
                    <View className="flex-row items-center mb-4">
                        <Sparkles color={isDark ? "#fbbf24" : "#d97706"} size={20} className="mr-2" />
                        <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter text-center">¡Éxito!</Text>
                        <Sparkles color={isDark ? "#fbbf24" : "#d97706"} size={20} className="ml-2" />
                    </View>
                    
                    <Text className="text-slate-500 dark:text-slate-400 font-bold text-center text-lg leading-6 px-4">
                        {message}
                    </Text>
                </Animated.View>
            </View>
        </Modal>
    );
};
