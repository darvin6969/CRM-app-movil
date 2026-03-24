import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, User, Bell, Settings, ChevronRight, Share2, ClipboardCopy } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Customer } from '../../types';
import * as Clipboard from 'expo-clipboard';
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
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    useEffect(() => {
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
                        referralCode: data.referral_code || `${data.name.split(' ')[0].toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                        joinDate: data.join_date,
                    });

                    // Fetch unread notifications count
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
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            await supabase.auth.signOut();
            setCustomer(null);
            setTimeout(() => {
                router.replace('/welcome' as any);
            }, 100);
        } catch (error) {
            console.error('Logout error:', error);
            router.replace('/welcome' as any);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const copyReferral = async () => {
        if (customer?.referralCode) {
            await Clipboard.setStringAsync(customer.referralCode);
            Alert.alert("¡Copiado!", `Código ${customer.referralCode} copiado al portapapeles.`);
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

    const joinYear = new Date(customer.joinDate).getFullYear();

    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#4c1d95', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                <ScrollView 
                    contentContainerStyle={{ padding: 24, paddingBottom: 100 }} 
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header */}
                    <View className="mb-8 mt-2">
                        <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Mi Perfil</Text>
                        <Text className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-widest mt-1">Configuración y Lealtad</Text>
                    </View>

                    {/* User Card */}
                    <BlurView 
                        intensity={isDark ? 20 : 60} 
                        tint={isDark ? "dark" : "light"}
                        className="rounded-[32px] p-8 items-center border border-white/20 dark:border-white/10 shadow-xl mb-8 overflow-hidden"
                    >
                        <View className="h-28 w-28 bg-primary/20 rounded-full items-center justify-center mb-6 border-4 border-white/30 dark:border-white/10">
                            <Text className="text-4xl font-black text-primary uppercase">{customer.name.substring(0, 2)}</Text>
                        </View>
                        <Text className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight text-center">{customer.name}</Text>
                        <Text className="text-slate-500 dark:text-slate-400 font-semibold mb-6 text-center">{customer.email}</Text>

                        <View className="flex-row gap-3">
                            <View className="bg-white/40 dark:bg-white/10 px-5 py-2 rounded-2xl border border-white/20">
                                <Text className="text-slate-900 dark:text-slate-200 font-bold text-[11px] uppercase tracking-wider">Socio desde {joinYear}</Text>
                            </View>
                            <View className="bg-green-500/20 px-5 py-2 rounded-2xl border border-green-500/20">
                                <Text className="text-green-600 dark:text-green-400 font-black text-[11px] uppercase tracking-wider">{customer.status}</Text>
                            </View>
                        </View>
                    </BlurView>

                    {/* QR Code Section */}
                    {customer.referralCode && (
                        <BlurView 
                            intensity={isDark ? 10 : 30}
                            tint={isDark ? "dark" : "light"}
                            className="rounded-[32px] p-8 items-center border border-white/20 dark:border-white/10 mb-8 overflow-hidden"
                        >
                            <View className="p-6 bg-white rounded-[40px] shadow-2xl shadow-black/10 items-center justify-center">
                                <QRCode
                                    value={customer.referralCode}
                                    size={200}
                                    color={isDark ? "#000" : "#0f172a"}
                                    backgroundColor="white"
                                />
                            </View>
                            <View className="mt-8 items-center">
                                <Text className="text-slate-900 dark:text-white font-black text-xl mb-2 tracking-tight">Tu Código QR</Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-center px-4 font-medium text-sm leading-5">
                                    Escanea este código en caja para acumular puntos y reclamar premios al instante.
                                </Text>
                            </View>
                        </BlurView>
                    )}

                    {/* Options List */}
                    <BlurView 
                        intensity={isDark ? 10 : 30}
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
