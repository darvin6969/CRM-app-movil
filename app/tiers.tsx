import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Award, Star, Zap, Gift, Shield, CheckCircle2, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { Customer, TIERS, LoyaltyTier } from '../types';
import { AnimatedButton } from '../components/AnimatedButton';

const TIER_DATA = {
    Bronze: {
        color: '#94a3b8',
        bg: ['#64748b', '#334155'],
        benefits: ['1.0x puntos en compras', 'Acceso al catálogo base', 'Soporte vía tickets'],
        icon: Shield
    },
    Silver: {
        color: '#a78bfa',
        bg: ['#8b5cf6', '#4c1d95'],
        benefits: ['1.2x puntos en compras', 'Ofertas exclusivas Silver', 'Regalo de Bienvenida'],
        icon: Star
    },
    Gold: {
        color: '#fbbf24',
        bg: ['#f59e0b', '#78350f'],
        benefits: ['1.5x puntos en compras', 'Acceso anticipado a premios', 'Regalo de Cumpleaños'],
        icon: Award
    },
    Platinum: {
        color: '#f8fafc',
        bg: ['#0f172a', '#000000'],
        benefits: ['2.0x puntos en compras', 'Soporte VIP 24/7', 'Eventos exclusivos Platinum', 'Envío gratis en canjes'],
        icon: Zap
    }
};

export default function TiersScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
                    });
                }
            } catch (error) {
                console.error('Error fetching tiers data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#8b5cf6" />
            </SafeAreaView>
        );
    }

    const currentPoints = customer?.totalPointsEarned || 0;
    const currentTier: LoyaltyTier = customer?.tier || 'Bronze';
    
    // Calculate progress to next tier
    const tierOrder: LoyaltyTier[] = ['Bronze', 'Silver', 'Gold', 'Platinum'];
    const currentIndex = tierOrder.indexOf(currentTier);
    const nextTier = currentIndex < 3 ? tierOrder[currentIndex + 1] : null;
    
    const currentThreshold = TIERS[currentTier];
    const nextThreshold = nextTier ? TIERS[nextTier] : currentThreshold;
    
    const pointsInCurrentRange = currentPoints - currentThreshold;
    const rangeTotal = nextThreshold - currentThreshold;
    const progress = nextTier ? Math.min(Math.max((pointsInCurrentRange / rangeTotal) * 100, 5), 100) : 100;
    const pointsToNext = nextTier ? nextThreshold - currentPoints : 0;

    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#4c1d95', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
                    {/* Header */}
                    <View className="px-6 py-4 flex-row items-center mt-2">
                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            className="mr-4 bg-white/20 dark:bg-black/20 p-3 rounded-2xl border border-white/20"
                        >
                            <ChevronLeft color={isDark ? "white" : "black"} size={22} />
                        </TouchableOpacity>
                        <View>
                            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Niveles</Text>
                            <Text className="text-slate-500 dark:text-slate-400 font-medium uppercase text-[10px] tracking-widest mt-0.5">Beneficios de Membresía</Text>
                        </View>
                    </View>

                    {/* Progress Hero */}
                    <View className="px-6 mt-6">
                        <BlurView 
                            intensity={isDark ? 30 : 60} 
                            tint={isDark ? "dark" : "light"}
                            className="rounded-[44px] p-10 border border-white/30 dark:border-white/10 shadow-2xl overflow-hidden"
                        >
                            <View className="items-center mb-8">
                                <View className={`h-24 w-24 rounded-full items-center justify-center mb-6 shadow-2xl shadow-primary/40`} style={{ backgroundColor: TIER_DATA[currentTier].color + '20' }}>
                                    {/* Using Lucide icon dynamically */}
                                    {(() => {
                                        const Icon = TIER_DATA[currentTier].icon;
                                        return <Icon color={TIER_DATA[currentTier].color} size={48} />;
                                    })()}
                                </View>
                                <Text className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-[4px] mb-2">Nivel Actual</Text>
                                <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{currentTier}</Text>
                            </View>

                            {/* Progress Bar */}
                            {nextTier && (
                                <View>
                                    <View className="flex-row justify-between mb-3 px-1">
                                        <Text className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{currentTier}</Text>
                                        <Text className="text-primary font-black text-[10px] uppercase tracking-widest">{nextTier}</Text>
                                    </View>
                                    <View className="h-4 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                        <LinearGradient
                                            colors={TIER_DATA[currentTier].bg as [string, string]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={{ width: `${progress}%`, height: '100%', borderRadius: 10 }}
                                        />
                                    </View>
                                    <Text className="text-center mt-6 text-slate-500 dark:text-slate-400 font-bold text-xs">
                                        Faltan <Text className="text-primary font-black">{pointsToNext}</Text> pts para ser {nextTier}
                                    </Text>
                                </View>
                            )}
                        </BlurView>
                    </View>

                    {/* All Tiers Cards */}
                    <View className="mt-12 px-6">
                        <Text className="text-slate-900 dark:text-white font-black text-xl mb-6 tracking-tight px-2">Guía de Beneficios</Text>
                        
                        {tierOrder.map((tier) => {
                            const data = TIER_DATA[tier];
                            const isCurrent = tier === currentTier;
                            const Icon = data.icon;

                            return (
                                <View key={tier} className="mb-6">
                                    <BlurView 
                                        intensity={isDark ? 20 : 40}
                                        tint={isDark ? "dark" : "light"}
                                        className={`rounded-[36px] overflow-hidden border ${isCurrent ? 'border-primary/50' : 'border-white/10'}`}
                                    >
                                        <View className="p-8">
                                            <View className="flex-row items-center justify-between mb-6">
                                                <View className="flex-row items-center">
                                                    <View className="bg-white/10 p-3 rounded-2xl mr-4 border border-white/10">
                                                        <Icon color={data.color} size={24} />
                                                    </View>
                                                    <View>
                                                        <Text className="text-slate-900 dark:text-white font-black text-2xl uppercase tracking-tighter italic">{tier}</Text>
                                                        {isCurrent && <Text className="text-primary font-black text-[8px] uppercase tracking-[2px] mt-1">Nivel Actual</Text>}
                                                    </View>
                                                </View>
                                            </View>

                                            <View className="gap-y-3">
                                                {data.benefits.map((benefit, i) => (
                                                    <View key={i} className="flex-row items-center">
                                                        <CheckCircle2 color={isCurrent ? "#8b5cf6" : "#475569"} size={14} className="mr-3" />
                                                        <Text className={`text-sm font-medium ${isCurrent ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {benefit}
                                                        </Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    </BlurView>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
