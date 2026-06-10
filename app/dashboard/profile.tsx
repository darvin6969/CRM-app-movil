import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Bell, Settings, ChevronRight, Camera, Award, Star } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Customer } from '../../types';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { AnimatedButton } from '../../components/AnimatedButton';

export default function ProfileScreen() {
    const router = useRouter();
    const [unreadCount, setUnreadCount] = useState(0);
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [customer, setCustomer] = useState<Customer | any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { data } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('email', session.user.email)
                    .single();
                if (data) setCustomer({
                    ...data,
                    loyaltyPoints: data.loyalty_points,
                    totalPointsEarned: data.total_points_earned || data.loyalty_points || 0,
                    referralCode: data.referral_code,
                    joinDate: data.join_date,
                    avatarUrl: data.avatar_url
                });

                const { count } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', session.user.id)
                    .eq('is_read', false);
                
                setUnreadCount(count || 0);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        setIsUploading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const fileExt = uri.split('.').pop();
            const fileName = `${session.user.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            // Convertir URI a Blob
            const response = await fetch(uri);
            const blob = await response.blob();

            // Limitar a 5 MB (5 * 1024 * 1024 bytes)
            if (blob.size > 5 * 1024 * 1024) {
                Alert.alert("Imagen muy pesada", "Por favor, elige una imagen que pese menos de 5MB.");
                setIsUploading(false);
                return;
            }

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, blob);

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Actualizar cliente
            const { error: updateError } = await supabase
                .from('customers')
                    .update({ avatar_url: publicUrl })
                .eq('email', session.user.email);

            if (updateError) throw updateError;

            setCustomer({ ...customer, avatarUrl: publicUrl });
            Alert.alert("¡Éxito!", "Foto de perfil actualizada correctamente.");
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            router.replace('/welcome' as any);
        } catch (error) {
            router.replace('/welcome' as any);
        } finally {
            setIsLoggingOut(false);
        }
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color={isDark ? "#a78bfa" : "#8b5cf6"} />
            </SafeAreaView>
        );
    }

    if (!customer) return null;

    const tierColors = {
        Bronze: ['#475569', '#1e293b'],
        Silver: ['#64748b', '#334155'],
        Gold: ['#b45309', '#78350f'],
        Platinum: ['#4c1d95', '#1e1b4b']
    };

    const currentTier: keyof typeof tierColors = customer.tier || 'Bronze';
    const cardColors = tierColors[currentTier];

    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#1e1b4b', '#000000'] : ['#e0e7ff', '#ffffff']}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                <ScrollView 
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }} 
                    showsVerticalScrollIndicator={false}
                >
                    {/* User Profile Info */}
                    <View className="items-center mt-6 mb-10">
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                            <View className="h-32 w-32 rounded-full border-4 border-white/50 dark:border-white/10 overflow-hidden shadow-2xl relative">
                                {customer.avatarUrl ? (
                                    <Image source={{ uri: customer.avatarUrl }} className="w-full h-full" />
                                ) : (
                                    <View className="w-full h-full bg-primary/20 items-center justify-center">
                                        <Text className="text-4xl font-black text-primary uppercase">{customer.name.substring(0, 2)}</Text>
                                    </View>
                                )}
                                {isUploading && (
                                    <View className="absolute inset-0 bg-black/40 items-center justify-center">
                                        <ActivityIndicator color="white" />
                                    </View>
                                )}
                                <View className="absolute bottom-0 right-0 left-0 bg-black/30 py-1 items-center">
                                    <Camera color="white" size={14} />
                                </View>
                            </View>
                        </TouchableOpacity>
                        
                        <Text className="text-3xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">{customer.name}</Text>
                        <View className="flex-row items-center mt-1">
                            <Star size={14} color="#f59e0b" fill="#f59e0b" />
                            <Text className="text-slate-500 dark:text-slate-400 font-bold ml-1 uppercase text-[10px] tracking-widest">Nivel {customer.tier}</Text>
                        </View>
                    </View>

                    {/* WALLET CARD DESIGN */}
                    {customer.referralCode && (
                        <View className="mb-10 shadow-2xl shadow-black/30">
                            <LinearGradient
                                colors={cardColors as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="rounded-[40px] p-8 overflow-hidden border border-white/20"
                            >
                                {/* Glass shine effect */}
                                <View className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full" />
                                
                                <View className="flex-row justify-between items-start mb-6">
                                    <View>
                                        <Text className="text-white/60 font-bold text-[10px] uppercase tracking-[3px]">Membresía Virtual</Text>
                                        <Text className="text-white text-xl font-black tracking-tight mt-1">{customer.name.toUpperCase()}</Text>
                                    </View>
                                    <View className="bg-white/20 p-2 rounded-xl">
                                        <Award color="white" size={20} />
                                    </View>
                                </View>

                                <View className="items-center bg-white p-6 rounded-[32px] shadow-lg">
                                    <QRCode
                                        value={customer.referralCode}
                                        size={160}
                                        color="#000"
                                        backgroundColor="white"
                                    />
                                    <Text className="mt-4 text-slate-900 font-black tracking-[4px] text-xs">
                                        {customer.referralCode}
                                    </Text>
                                </View>

                                <View className="mt-8 flex-row justify-between items-end">
                                    <View>
                                        <Text className="text-white/60 font-bold text-[8px] uppercase tracking-widest">Saldo Actual</Text>
                                        <Text className="text-white text-2xl font-black">{customer.loyaltyPoints.toLocaleString()} PTS</Text>
                                    </View>
                                    <Image 
                                        source={require('../../assets/quantica-logo.png')} 
                                        className="w-10 h-10 opacity-50 tint-white" 
                                        style={{ tintColor: 'white' }}
                                    />
                                </View>
                            </LinearGradient>
                        </View>
                    )}

                    {/* Options List */}
                    <BlurView 
                        intensity={isDark ? 15 : 30}
                        tint={isDark ? "dark" : "light"}
                        className="rounded-[32px] border border-white/20 dark:border-white/10 mb-10 overflow-hidden"
                    >
                        {[
                            { icon: User, label: "Datos Personales", color: "#3b82f6", bg: "bg-blue-100 dark:bg-blue-900/40", onPress: () => router.push('/personal-data') },
                            { icon: Bell, label: "Notificaciones", color: "#8b5cf6", bg: "bg-purple-100 dark:bg-purple-900/40", onPress: () => router.push('/notifications'), badge: unreadCount },
                            { icon: Settings, label: `Tema (${isDark ? 'Oscuro' : 'Claro'})`, color: "#64748b", bg: "bg-slate-100 dark:bg-slate-800/60", onPress: toggleColorScheme },
                        ].map((item, idx, arr) => (
                            <TouchableOpacity 
                                key={idx}
                                className={`flex-row items-center justify-between p-6 ${idx !== arr.length - 1 ? 'border-b border-white/10' : ''}`}
                                onPress={item.onPress}
                            >
                                <View className="flex-row items-center gap-4">
                                    <View className={`${item.bg} p-3 rounded-2xl`}>
                                        <item.icon color={item.color} size={20} />
                                    </View>
                                    <View>
                                        <Text className="font-extrabold text-slate-900 dark:text-white text-base tracking-tight">{item.label}</Text>
                                        {item.badge ? (
                                            <Text className="text-primary font-bold text-[10px] uppercase tracking-widest">{item.badge} nuevas</Text>
                                        ) : null}
                                    </View>
                                </View>
                                <ChevronRight color={isDark ? "#64748b" : "#94a3b8"} size={20} />
                            </TouchableOpacity>
                        ))}
                    </BlurView>

                    {/* Logout Button */}
                    <TouchableOpacity
                        activeOpacity={0.7}
                        className={`p-6 rounded-[32px] flex-row items-center justify-center gap-3 border mb-10 ${isLoggingOut ? 'bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800' : 'bg-red-500/10 border-red-500/20'}`}
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                            <>
                                <LogOut color="#ef4444" size={24} />
                                <Text className="text-red-500 font-black text-lg uppercase tracking-widest">Cerrar Sesión</Text>
                            </>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
