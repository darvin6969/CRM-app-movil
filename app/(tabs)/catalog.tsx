import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Reward, Customer } from '../../types';
import { Skeleton, SkeletonCard, SkeletonCircle } from '../../components/Skeleton';
import { AnimatedButton } from '../../components/AnimatedButton';
import { SuccessOverlay } from '../../components/SuccessOverlay';

const CatalogSkeleton = () => (
    <View style={{ padding: 20, marginTop: 10 }}>
        <Skeleton width={120} height={10} style={{ marginBottom: 15 }} />
        <Skeleton width="100%" height={100} borderRadius={32} style={{ marginBottom: 30 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {[1, 2, 3, 4].map(i => (
                <View key={i} style={{ width: '48%', marginBottom: 16 }}>
                    <Skeleton width="100%" height={130} borderRadius={32} style={{ marginBottom: 10 }} />
                    <Skeleton width="80%" height={12} style={{ marginBottom: 8 }} />
                    <Skeleton width="50%" height={10} />
                </View>
            ))}
        </View>
    </View>
);

export default function CatalogScreen() {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [customerPoints, setCustomerPoints] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const loadCatalogData = async () => {
        try {
            setError('');

            // 1. Fetch User Points
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                const { data: customerData } = await supabase
                    .from('customers')
                    .select('loyalty_points')
                    .eq('email', session.user.email)
                    .single();

                if (customerData) {
                    setCustomerPoints(customerData.loyalty_points);
                }
            }

            // 2. Fetch Rewards
            const { data: rewardsData, error: rewardsError } = await supabase
                .from('rewards')
                .select('*')
                .eq('active', true)
                .order('points_cost', { ascending: true });

            if (rewardsError) throw rewardsError;
            setRewards((rewardsData || []).map((r: any) => ({
                id: r.id,
                name: r.name,
                description: r.description,
                pointsCost: r.points_cost,
                image: r.image_url
            })));

        } catch (err: any) {
            console.error('Error fetching catalog:', err);
            setError('No pudimos cargar el catálogo. Inténtalo de nuevo.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadCatalogData();
        }, [])
    );

    useEffect(() => {
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadCatalogData();
    };

    const handleRedeem = (reward: Reward) => {
        if (customerPoints < reward.pointsCost) {
            Alert.alert("Puntos Insuficientes", `Necesitas ${reward.pointsCost - customerPoints} puntos más para canjear esto.`);
            return;
        }

        Alert.alert(
            "Confirmar Canje",
            `¿Estás seguro que deseas canjear ${reward.pointsCost} puntos por "${reward.name}"?`,
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Sí, Canjear",
                    onPress: async () => {
                        try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session?.user?.email) throw new Error("Inicia sesión primero");

                            // 1. Obtener ID
                            const { data: customerData } = await supabase
                                .from('customers')
                                .select('id, loyalty_points')
                                .eq('email', session.user.email)
                                .single();

                            if (!customerData) throw new Error("Perfil no encontrado");

                            // 2. Cálculo
                            const newPoints = (customerData.loyalty_points || 0) - reward.pointsCost;

                            // 3. ACTUALIZACIÓN VISUAL INMEDIATA
                            setCustomerPoints(newPoints);
                            setSuccessMsg(`Has canjeado "${reward.name}" con éxito.`);
                            setShowSuccess(true);

                            // 4. GUARDAR EN DB (Silenciosamente)
                            await supabase.from('customers').update({ loyalty_points: newPoints }).eq('id', customerData.id);
                            await supabase.from('transactions').insert([{
                                customer_id: customerData.id,
                                points_earned: -reward.pointsCost,
                                description: `Canje App: ${reward.name}`
                            }]);

                        } catch (err: any) {
                            console.error('Error:', err);
                            Alert.alert("Error", err.message || "No se pudo canjear.");
                            loadCatalogData(); // Recargar por si falló algo
                        }
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black">
                <CatalogSkeleton />
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black items-center justify-center p-6">
                <AlertCircle color="#ef4444" size={48} className="mb-4" />
                <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">¡Ups!</Text>
                <Text className="text-slate-500 text-center mb-6">{error}</Text>
            </SafeAreaView>
        );
    }

    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#3b0764', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                {/* Header Section */}
                <View className="px-6 py-6 pb-2">
                    <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">Premios</Text>
                    <Text className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-widest">Canjea tu lealtad</Text>
                </View>

                <ScrollView
                    contentContainerStyle={{ padding: 20 }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#a78bfa" : "#8b5cf6"} />}
                >
                    {/* Points Banner */}
                    <AnimatedButton activeScale={0.98}>
                        <BlurView 
                            intensity={isDark ? 20 : 60} 
                            tint={isDark ? "dark" : "light"}
                            className="rounded-[32px] p-6 mb-8 overflow-hidden border border-white/20 dark:border-white/10 flex-row items-center justify-between shadow-lg shadow-black/5"
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/40">
                                    <Sparkles color="white" size={24} />
                                </View>
                                <View>
                                    <Text className="text-slate-900 dark:text-white font-black text-2xl tracking-tight">{customerPoints}</Text>
                                    <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase">Puntos Totales</Text>
                                </View>
                            </View>
                            <View className="bg-primary/10 dark:bg-primary/20 px-4 py-2 rounded-full border border-primary/20">
                                <Text className="text-primary font-bold text-xs">VIP</Text>
                            </View>
                        </BlurView>
                    </AnimatedButton>

                    {rewards.length === 0 ? (
                        <BlurView 
                            intensity={10} 
                            className="rounded-3xl p-10 items-center justify-center border border-dashed border-slate-300 dark:border-zinc-800"
                        >
                            <ShoppingBag color="#94a3b8" size={48} className="mb-4 opacity-50" />
                            <Text className="text-center text-slate-500 font-medium">No hay recompensas disponibles en este momento.</Text>
                        </BlurView>
                    ) : (
                        <View className="flex-row flex-wrap justify-between gap-y-4">
                            {rewards.map((reward) => {
                                const canAfford = customerPoints >= reward.pointsCost;
                                const diff = reward.pointsCost - customerPoints;

                                return (
                                    <AnimatedButton 
                                        key={reward.id} 
                                        className="w-[48%] mb-4"
                                        onPress={() => handleRedeem(reward)}
                                    >
                                        <BlurView 
                                            intensity={isDark ? 15 : 40}
                                            tint={isDark ? "dark" : "light"}
                                            className="rounded-[32px] border border-white/20 dark:border-white/10 overflow-hidden shadow-sm h-full"
                                        >
                                            {/* Status Badge */}
                                            {canAfford && (
                                                <View className="absolute top-3 right-3 bg-green-500 z-10 px-2 py-0.5 rounded-full shadow-lg">
                                                    <Text className="text-[10px] text-white font-black uppercase">¡Listo!</Text>
                                                </View>
                                            )}
                                            
                                            {/* Image Section */}
                                            <View className={`h-32 w-full items-center justify-center overflow-hidden ${canAfford ? 'bg-primary/10' : 'bg-slate-100/50 dark:bg-black/20'}`}>
                                                {reward.image ? (
                                                    <Image 
                                                        source={{ uri: reward.image }} 
                                                        className="w-full h-full"
                                                        style={{ resizeMode: 'cover' }}
                                                    />
                                                ) : (
                                                    <Gift color={canAfford ? (isDark ? '#a78bfa' : '#8b5cf6') : (isDark ? '#475569' : '#64748b')} size={40} />
                                                )}
                                            </View>

                                            <View className="p-4 pt-3">
                                                <Text className="font-extrabold text-base text-slate-900 dark:text-white mb-1 leading-tight" numberOfLines={1}>
                                                    {reward.name}
                                                </Text>
                                                <Text className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 mb-3" numberOfLines={1}>
                                                    {reward.description}
                                                </Text>
                                                
                                                <View className="flex-row items-baseline mb-4">
                                                    <Text className="text-primary font-black text-xl tracking-tighter">{reward.pointsCost}</Text>
                                                    <Text className="text-[10px] font-bold text-primary ml-1 uppercase">pts</Text>
                                                </View>

                                                <View
                                                    className={`w-full py-3 rounded-2xl items-center shadow-md ${canAfford ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-800'}`}
                                                >
                                                    <Text className={`font-black text-[10px] uppercase tracking-widest ${canAfford ? 'text-white' : 'text-slate-400'}`}>
                                                        {canAfford ? 'Canjear' : `Faltan ${diff}`}
                                                    </Text>
                                                </View>
                                            </View>
                                        </BlurView>
                                    </AnimatedButton>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>

            <SuccessOverlay 
                visible={showSuccess}
                message={successMsg}
                onClose={() => setShowSuccess(false)}
                isDark={isDark}
            />
        </View>
    );
}
