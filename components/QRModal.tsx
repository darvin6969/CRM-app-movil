import React from 'react';
import { View, Text, Modal, TouchableOpacity, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { X, Share2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface QRModalProps {
    visible: boolean;
    onClose: () => void;
    qrValue: string;
    userName: string;
    isDark: boolean;
}

export const QRModal: React.FC<QRModalProps> = ({ visible, onClose, qrValue, userName, isDark }) => {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center px-6">
                <BlurView 
                    intensity={100} 
                    tint={isDark ? "dark" : "light"} 
                    className="absolute inset-0"
                />
                
                <TouchableOpacity 
                    className="absolute inset-0" 
                    onPress={onClose} 
                    activeOpacity={1} 
                />

                <BlurView 
                    intensity={isDark ? 40 : 80}
                    tint={isDark ? "dark" : "light"}
                    className="w-full rounded-[48px] p-8 overflow-hidden border border-white/20 dark:border-white/10 shadow-3xl"
                >
                    <View className="flex-row justify-between items-center mb-10">
                        <View>
                            <Text className="text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-[4px]">Mi Miembro</Text>
                            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{userName}</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={onClose}
                            className="bg-white/20 dark:bg-black/20 p-3 rounded-2xl"
                        >
                            <X size={20} color={isDark ? "white" : "black"} />
                        </TouchableOpacity>
                    </View>

                    <View className="items-center mb-10">
                        <View className="p-8 bg-white rounded-[40px] shadow-2xl shadow-black/20 border-8 border-slate-50 dark:border-zinc-900/50">
                            <QRCode
                                value={qrValue}
                                size={220}
                                color="#000"
                                backgroundColor="transparent"
                            />
                        </View>
                    </View>

                    <View className="items-center mb-10">
                        <View className="bg-primary/10 dark:bg-primary/20 px-6 py-2 rounded-full border border-primary/20 mb-3">
                            <Text className="text-primary font-black text-xs uppercase tracking-widest">{qrValue}</Text>
                        </View>
                        <Text className="text-slate-500 dark:text-slate-400 text-center font-bold text-sm px-6 leading-5">
                            Muestra este código al vendedor para acumular puntos por tu compra.
                        </Text>
                    </View>

                    <TouchableOpacity 
                        className="w-full bg-slate-900 dark:bg-white h-16 rounded-2xl flex-row items-center justify-center shadow-xl"
                    >
                        <Share2 size={20} color={isDark ? "black" : "white"} />
                        <Text className="text-white dark:text-slate-900 font-black uppercase tracking-widest ml-3">Compartir Código</Text>
                    </TouchableOpacity>
                </BlurView>
            </View>
        </Modal>
    );
};
