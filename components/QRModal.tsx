import React from 'react';
import { View, Text, Modal, TouchableOpacity, Share } from 'react-native';
import { BlurView } from 'expo-blur';
import QRCode from 'react-native-qrcode-svg';
import { X, Share2 } from 'lucide-react-native';

interface QRModalProps {
    visible: boolean;
    onClose: () => void;
    qrValue: string;
    userName: string;
    isDark: boolean;
}

export const QRModal: React.FC<QRModalProps> = ({ visible, onClose, qrValue, userName, isDark }) => {
    
    const handleShare = async () => {
        try {
            await Share.share({
                message: `¡Hola! Únete a nuestro club de beneficios y gana premios increíbles. 🎁\n\nUsa mi código exclusivo al registrarte o en tu próxima compra:\n👉 *${qrValue}*`,
            });
        } catch (error) {
            console.error('Error al compartir:', error);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-center items-center px-6">
                {/* Backdrop sólido y semitransparente para arreglar el sangrado de texto en Android */}
                <View 
                    className="absolute inset-0"
                    style={{ backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}
                />
                
                <TouchableOpacity 
                    className="absolute inset-0" 
                    onPress={onClose} 
                    activeOpacity={1} 
                />

                {/* Contenedor Principal (Tarjeta) */}
                <View 
                    className="w-full rounded-[40px] p-8 overflow-hidden shadow-2xl"
                    style={{ 
                        backgroundColor: isDark ? '#18181b' : '#ffffff',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        elevation: 20
                    }}
                >
                    {/* Header */}
                    <View className="flex-row justify-between items-start mb-8">
                        <View className="flex-1 pr-4">
                            <Text className="text-primary font-black uppercase text-[10px] tracking-[3px] mb-1">
                                TARJETA DE FIDELIDAD
                            </Text>
                            <Text 
                                className="text-2xl font-black text-slate-900 dark:text-white tracking-tight"
                                numberOfLines={2}
                                adjustsFontSizeToFit
                            >
                                {userName}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={onClose}
                            className="bg-slate-100 dark:bg-zinc-800 p-3 rounded-full mt-1"
                        >
                            <X size={20} color={isDark ? "white" : "black"} />
                        </TouchableOpacity>
                    </View>

                    {/* QR Code Container */}
                    <View className="items-center mb-8">
                        <View className="p-6 bg-white rounded-[32px] shadow-lg shadow-black/10 border-4 border-slate-50 dark:border-zinc-800">
                            {qrValue ? (
                                <QRCode
                                    value={qrValue}
                                    size={200}
                                    color="#000"
                                    backgroundColor="transparent"
                                    logo={require('../assets/quantica-logo-small.png')}
                                    logoSize={45}
                                    logoBackgroundColor="white"
                                    logoMargin={0}
                                    logoBorderRadius={25}
                                />
                            ) : (
                                <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center' }}>
                                    <View className="bg-slate-100 rounded-2xl p-4">
                                        <Text className="text-slate-400 font-bold text-xs">Cargando...</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Referral Info */}
                    <View className="items-center mb-8">
                        <Text className="text-primary font-black text-base uppercase tracking-widest mb-3 text-center">
                            {(() => {
                                const words = userName.trim().split(/\s+/);
                                if (words.length >= 4) return `${words[0]} ${words[2]}`; // Juan Pablo Perez Gomez -> Juan Perez
                                if (words.length === 3) return `${words[0]} ${words[1]}`; // Juan Perez Gomez -> Juan Perez
                                return words.slice(0, 2).join(' '); // Juan Perez -> Juan Perez
                            })()}
                        </Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-center font-semibold text-sm px-4 leading-5">
                            Muestra este código al vendedor para acumular puntos.
                        </Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity 
                        onPress={handleShare}
                        className="w-full bg-primary h-14 rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30 active:scale-95 transition-transform"
                    >
                        <Share2 size={18} color="white" />
                        <Text className="text-white font-black uppercase tracking-widest ml-3 text-xs">
                            Compartir Código
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};
