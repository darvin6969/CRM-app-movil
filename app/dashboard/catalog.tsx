import { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, AlertCircle, ShoppingBag, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../../lib/supabase';
import { Reward } from '../../types';
import { Skeleton } from '../../components/Skeleton';
import { AnimatedButton } from '../../components/AnimatedButton';
import { SuccessOverlay } from '../../components/SuccessOverlay';
import { AlertModal } from '../../components/AlertModal';

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

    // Premium Alert States
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'error';
        actionLabel?: string;
        onAction?: () => void;
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

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
                    setCustomerPoints(customerData.loyalty_points || 0);
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

    useEffect(() => {
        loadCatalogData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadCatalogData();
    };

    const handleRedeem = (reward: Reward) => {
        if (customerPoints < reward.pointsCost) {
            setAlertConfig({
                visible: true,
                title: "Puntos Insuficientes",
                message: `Necesitas ${reward.pointsCost - customerPoints} puntos más para canjear este premio. ¡Sigue acumulando!`,
                type: 'warning',
                actionLabel: "Entendido"
            });
            return;
        }

        setAlertConfig({
            visible: true,
            title: "Confirmar Canje",
            message: `¿Estás seguro que deseas canjear ${reward.pointsCost} puntos por "${reward.name}"?`,
            type: 'info',
            actionLabel: "Sí, Canjear",
            onAction: async () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                
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

                    // 4. GUARDAR EN DB
                    await supabase.from('customers').update({ loyalty_points: newPoints }).eq('id', customerData.id);
                    await supabase.from('transactions').insert([{
                        customer_id: customerData.id,
                        points_earned: -reward.pointsCost,
                        description: `Canje App: ${reward.name}`,
                        type: 'Redemption'
                    }]);

                } catch (err: any) {
                    console.error('Error:', err);
                    setAlertConfig({
                        visible: true,
                        title: "Error",
                        message: err.message || "No se pudo procesar el canje.",
                        type: 'error',
                        actionLabel: "Cerrar"
                    });
                    loadCatalogData(); // Recargar por si falló algo
                }
            }
        });
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
                colors={isDark ? ['#4c1d95', '#000000'] : ['#c4b5fd', '#ffffff']}
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
                            intensity={isDark ? 25 : 60} 
                            tint={isDark ? "dark" : "light"}
                            className="rounded-[32px] p-6 mb-8 overflow-hidden border border-white/20 dark:border-white/10 flex-row items-center justify-between shadow-lg shadow-black/5"
                        >
                            <View className="flex-row items-center gap-4">

                                <View>
                                    <Text className="text-slate-900 dark:text-white font-black text-3xl tracking-tighter">{customerPoints}</Text>
                                    <View className="flex-row items-center gap-1">
                                        <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">Puntos Totales</Text>
                                    </View>
                                </View>
                            </View>
                            <View className="bg-primary/20 dark:bg-primary/30 px-4 py-1.5 rounded-full border border-primary/30">
                                <Text className="text-primary dark:text-primary-foreground font-black text-[10px] uppercase tracking-tighter">VIP Silver</Text>
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
                                        className="w-[48%] mb-2"
                                        onPress={() => handleRedeem(reward)}
                                    >
                                        <BlurView 
                                            intensity={isDark ? 15 : 40}
                                            tint={isDark ? "dark" : "light"}
                                            className="rounded-[28px] border border-white/10 dark:border-white/5 overflow-hidden shadow-sm"
                                        >
                                            {/* Status Badge */}
                                            {canAfford && (
                                                <View className="absolute top-2.5 right-2.5 bg-green-500 z-10 px-2 py-0.5 rounded-full shadow-lg">
                                                    <Text className="text-[8px] text-white font-black uppercase">¡Listo!</Text>
                                                </View>
                                            )}
                                            
                                            {/* Image Section */}
                                            <View className={`h-28 w-full items-center justify-center overflow-hidden ${canAfford ? 'bg-primary/5' : 'bg-slate-50 dark:bg-black/10'}`}>
                                                {reward.image ? (
                                                    <Image 
                                                        source={{ uri: reward.image }} 
                                                        className="w-full h-full"
                                                        style={{ resizeMode: 'cover' }}
                                                    />
                                                ) : (
                                                    <LinearGradient
                                                        colors={canAfford ? ['#f3f0ff', '#e9e3ff'] : (isDark ? ['#2e1065', '#1a0b2e'] : ['#f8fafc', '#f1f5f9'])}
                                                        className="w-full h-full items-center justify-center"
                                                    >
                                                        <Gift color={canAfford ? '#8b5cf6' : (isDark ? '#4c1d95' : '#94a3b8')} size={32} />
                                                    </LinearGradient>
                                                )}
                                            </View>
                                            
                                            <View className="p-3.5">
                                                <Text className="font-black text-sm text-slate-900 dark:text-white mb-0.5" numberOfLines={1}>
                                                    {reward.name}
                                                </Text>
                                                
                                                <View className="flex-row items-baseline mb-3">
                                                    <Text className="text-primary font-black text-lg tracking-tighter">{reward.pointsCost}</Text>
                                                    <Text className="text-[8px] font-bold text-primary ml-0.5 uppercase">pts</Text>
                                                </View>
                                                
                                                <View
                                                    className={`w-full py-2.5 rounded-xl items-center ${canAfford ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-100/50 dark:bg-white/5'}`}
                                                >
                                                    <Text className={`font-black text-[9px] uppercase tracking-widest ${canAfford ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        Canjear
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

            <AlertModal 
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                actionLabel={alertConfig.actionLabel}
                onAction={alertConfig.onAction}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                isDark={isDark}
            />
        </View>
    );
}
