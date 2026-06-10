import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { AnimatedButton } from './AnimatedButton';

interface AlertModalProps {
    visible: boolean;
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'success';
    onClose: () => void;
    isDark: boolean;
    actionLabel?: string;
    onAction?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ 
    visible, title, message, type = 'info', onClose, isDark, actionLabel = "Entendido", onAction 
}) => {
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                })
            ]).start();
        } else {
            scaleAnim.setValue(0.8);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    if (!visible) return null;

    const getColors = () => {
        switch (type) {
            case 'error': return { main: '#ef4444', bg: 'bg-red-500/10', icon: AlertCircle };
            case 'warning': return { main: '#f59e0b', bg: 'bg-amber-500/10', icon: AlertTriangle };
            case 'success': return { main: '#22c55e', bg: 'bg-green-500/10', icon: AlertCircle };
            default: return { main: '#8b5cf6', bg: 'bg-primary/10', icon: Info };
        }
    };

    const config = getColors();
    const Icon = config.icon;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View className="flex-1 items-center justify-center px-6">
                <Pressable 
                    style={StyleSheet.absoluteFill}
                    className="bg-black/60" 
                    onPress={onClose}
                />
                
                <Animated.View 
                    style={{ 
                        transform: [{ scale: scaleAnim }], 
                        opacity: opacityAnim,
                    }}
                    className="w-full max-w-sm"
                >
                    <View 
                        className="rounded-[40px] p-8 pt-10 bg-white dark:bg-[#1a0b2e] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden items-center relative"
                    >
                        <TouchableOpacity 
                            onPress={onClose}
                            style={{ zIndex: 50, elevation: 50 }}
                            className="absolute top-4 right-4 p-3 rounded-full bg-slate-100 dark:bg-white/10"
                        >
                            <X size={20} color={isDark ? '#fff' : '#000'} />
                        </TouchableOpacity>
                        <View className={`${config.bg} p-6 rounded-[32px] mb-6 shadow-xl`}>
                            <Icon color={config.main} size={48} />
                        </View>
                        
                        <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter text-center mb-2">
                            {title}
                        </Text>
                        
                        <Text className="text-slate-500 dark:text-slate-400 font-bold text-center text-base leading-6 mb-8 px-2">
                            {message}
                        </Text>
                        
                        <AnimatedButton 
                            onPress={onAction || onClose}
                            className="w-full bg-slate-900 dark:bg-white h-16 rounded-[24px] items-center justify-center shadow-lg"
                        >
                            <Text className="text-white dark:text-slate-900 font-black text-lg uppercase tracking-widest">
                                {actionLabel}
                            </Text>
                        </AnimatedButton>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};
