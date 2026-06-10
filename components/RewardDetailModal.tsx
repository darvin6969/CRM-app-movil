import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Modal, TouchableOpacity, Pressable, Image, ScrollView } from 'react-native';
import { X, Gift } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedButton } from './AnimatedButton';
import { Reward } from '../types';

interface RewardDetailModalProps {
    visible: boolean;
    reward: Reward | null;
    customerPoints: number;
    onClose: () => void;
    onRedeem: () => void;
    isDark: boolean;
}

export const RewardDetailModal: React.FC<RewardDetailModalProps> = ({ 
    visible, reward, customerPoints, onClose, onRedeem, isDark 
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

    if (!visible || !reward) return null;

    const canAfford = customerPoints >= reward.pointsCost;
    const diff = reward.pointsCost - customerPoints;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View className="flex-1 items-center justify-center px-6">
                <Pressable 
                    style={StyleSheet.absoluteFill}
                    className="bg-black/70" 
                    onPress={onClose}
                />
                
                <Animated.View 
                    style={{ 
                        transform: [{ scale: scaleAnim }], 
                        opacity: opacityAnim,
                    }}
                    className="w-full max-w-sm max-h-[80%]"
                >
                    <View className="rounded-[40px] bg-white dark:bg-[#1a0b2e] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
                        
                        {/* Image Header */}
                        <View className="w-full h-48 bg-slate-100 dark:bg-black/20 items-center justify-center relative overflow-hidden">
                            {reward.image ? (
                                <Image 
                                    source={{ uri: reward.image }} 
                                    className="w-full h-full"
                                    style={{ resizeMode: 'cover' }}
                                />
                            ) : (
                                <LinearGradient
                                    colors={isDark ? ['#2e1065', '#1a0b2e'] : ['#f8fafc', '#f1f5f9']}
                                    className="w-full h-full items-center justify-center"
                                >
                                    <Gift color={isDark ? '#4c1d95' : '#94a3b8'} size={64} />
                                </LinearGradient>
                            )}
                            
                            {/* Gradient Overlay for better contrast */}
                            <LinearGradient
                                colors={['transparent', isDark ? '#1a0b2e' : '#ffffff']}
                                className="absolute bottom-0 left-0 right-0 h-20"
                            />

                            <TouchableOpacity 
                                onPress={onClose}
                                style={{ zIndex: 50, elevation: 50 }}
                                className="absolute top-4 right-4 p-3 rounded-full bg-black/40 backdrop-blur-md"
                            >
                                <X size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-8 pt-2 pb-8" showsVerticalScrollIndicator={false}>
                            <View className="items-center mb-6">
                                <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter text-center mb-3">
                                    {reward.name}
                                </Text>
                                
                                <View className="bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-2xl flex-row items-baseline justify-center mb-6">
                                    <Text className="text-primary font-black text-2xl tracking-tighter">{reward.pointsCost}</Text>
                                    <Text className="text-xs font-bold text-primary ml-1 uppercase">pts</Text>
                                </View>

                                {reward.description ? (
                                    <Text className="text-slate-500 dark:text-slate-400 font-medium text-center text-base leading-6">
                                        {reward.description}
                                    </Text>
                                ) : null}
                            </View>

                            {canAfford ? (
                                <AnimatedButton 
                                    onPress={onRedeem}
                                    className="w-full bg-primary h-16 rounded-[24px] items-center justify-center shadow-lg shadow-primary/30 mt-2"
                                >
                                    <Text className="text-white font-black text-lg uppercase tracking-widest">
                                        Confirmar Canje
                                    </Text>
                                </AnimatedButton>
                            ) : (
                                <View 
                                    className="w-full bg-slate-200 dark:bg-white/5 h-16 rounded-[24px] items-center justify-center mt-2"
                                >
                                    <Text className="text-slate-500 dark:text-slate-400 font-black text-sm uppercase tracking-widest">
                                        Te faltan {diff} pts
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};
