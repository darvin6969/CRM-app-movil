import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Award, ArrowUpRight, ArrowDownRight, AlertCircle, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { supabase } from '../../lib/supabase';
import { Customer, Transaction, TIERS } from '../../types';
import { Skeleton, SkeletonCard, SkeletonCircle } from '../../components/Skeleton';
import { AnimatedButton } from '../../components/AnimatedButton';

const DashboardSkeleton = () => (
    <View style={{ padding: 24, marginTop: 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
            <View>
                <Skeleton width={100} height={12} style={{ marginBottom: 12 }} />
                <Skeleton width={180} height={32} />
            </View>
            <SkeletonCircle size={48} />
        </View>
        <Skeleton width="100%" height={220} borderRadius={32} style={{ marginBottom: 40 }} />
        <Skeleton width={150} height={24} style={{ marginBottom: 20 }} />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
    </View>
);

export default function DashboardScreen() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const loadDashboardData = async () => {
        try {
            setError('');
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user?.email) {
                setError('No hay sesión activa.');
                return;
            }

            // Fetch customer by email
            const { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (customerError) throw customerError;
            if (customerData) {
                setCustomer({
                    ...customerData,
                    loyaltyPoints: customerData.loyalty_points || 0,
                    totalPointsEarned: customerData.total_points_earned || customerData.loyalty_points || 0,
                    referralCode: customerData.referral_code || `${customerData.name.split(' ')[0].toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                    joinDate: customerData.join_date,
                });

                // Fetch recent 5 transactions
                const { data: txData, error: txError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('customer_id', customerData.id)
                    .order('date', { ascending: false })
                    .limit(5);

                if (txError) throw txError;
                setTransactions((txData || []).map((tx: any) => ({
                    ...tx,
                    customerId: tx.customer_id,
                    pointsEarned: tx.points_earned
                })));
            }
        } catch (err: any) {
            console.error('Error fetching dashboard:', err);
            setError('No pudimos cargar tu información. Intenta de nuevo.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadDashboardData();
    };

    if (isLoading) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black">
                <DashboardSkeleton />
            </SafeAreaView>
        );
    }

    if (error || !customer) {
        return (
            <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black items-center justify-center p-6">
                <AlertCircle color="#ef4444" size={48} className="mb-4" />
                <Text className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">¡Ups!</Text>
                <Text className="text-slate-500 text-center mb-6">{error || 'No se encontró el perfil de cliente asociado a esta cuenta.'}</Text>
            </SafeAreaView>
        );
    }

    // Calculate progress to next tier
    const tierKeys = Object.keys(TIERS);
    const currentTierIndex = tierKeys.indexOf(customer.tier || 'Bronze');
    const nextTierName = tierKeys[currentTierIndex + 1];
    
    const earnedPoints = customer.totalPointsEarned || customer.loyaltyPoints || 0;
    const nextTierPoints = nextTierName ? TIERS[nextTierName as keyof typeof TIERS] : earnedPoints;
    const progressPercent = nextTierName && nextTierPoints > 0
        ? (earnedPoints / nextTierPoints) * 100
        : 100;


    const customerName = customer.name || 'Cliente';
    const firstName = customerName.split(' ')[0];
    const initials = customerName.substring(0, 2);

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black">
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#a78bfa" : "#8b5cf6"} />}
            >
                {/* Header */}
                <View className="flex-row justify-between items-center mb-8 mt-2">
                    <View>
                        <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium tracking-wider uppercase mb-1">Hola de nuevo,</Text>
                        <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{firstName}</Text>
                    </View>
                    <View className="bg-primary/10 dark:bg-primary/20 p-2 rounded-full h-12 w-12 items-center justify-center border border-primary/20">
                        <Text className="text-primary font-black text-lg uppercase">{initials}</Text>
                    </View>
                </View>

                {/* Loyalty Card */}
                <AnimatedButton activeScale={0.98}>
                    <LinearGradient 
                        colors={['#8b5cf6', '#6d28d9']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }}
                        className="rounded-[32px] p-8 shadow-xl shadow-primary/40 mb-10"
                    >
                        <View className="flex-row justify-between items-start mb-6">
                            <View className="bg-white/20 px-4 py-1.5 rounded-full border border-white/20">
                                <Text className="text-white text-xs font-bold tracking-wider uppercase">Nivel {customer.tier}</Text>
                            </View>
                            <View className="bg-white/20 p-2 rounded-full">
                                <Award color="white" size={24} />
                            </View>
                        </View>

                        <Text className="text-white/80 text-sm font-medium mb-1 uppercase tracking-wider">Puntos Disponibles</Text>
                        <Text className="text-white text-6xl font-black tracking-tighter mb-2">{customer.loyaltyPoints}</Text>

                        {nextTierName ? (
                            <View className="mt-2">
                                <Text className="text-white/80 text-sm font-medium">Faltan {Math.max(0, nextTierPoints - earnedPoints)} pts para Nivel {nextTierName}</Text>
                                <View className="w-full bg-black/20 h-3 rounded-full mt-3 overflow-hidden border border-white/10">
                                    <View className="bg-white h-full rounded-full" style={{ width: `${Math.min(100, progressPercent)}%` }} />
                                </View>
                            </View>
                        ) : (
                            <View className="mt-2 bg-white/20 p-3 rounded-2xl border border-white/20">
                                <Text className="text-white/90 text-sm font-bold text-center">¡Felicidades! Eres el Nivel Máximo 🏆</Text>
                            </View>
                        )}
                    </LinearGradient>
                </AnimatedButton>

                {/* Recent Transactions */}
                <Text className="text-xl font-black text-slate-900 dark:text-white mb-5 tracking-tight">Actividad Reciente</Text>
                
                <View className="gap-y-3">
                    {transactions.length === 0 ? (
                        <BlurView 
                            intensity={isDark ? 10 : 30}
                            tint={isDark ? "dark" : "light"}
                            className="rounded-[32px] p-10 items-center justify-center border border-white/20 dark:border-white/10 overflow-hidden"
                        >
                            <View className="bg-slate-200 dark:bg-white/5 p-5 rounded-full mb-4">
                                <Award color={isDark ? "#4b5563" : "#94a3b8"} size={32} />
                            </View>
                            <Text className="text-slate-500 dark:text-zinc-400 text-center font-bold">No tienes transacciones aún.</Text>
                            <Text className="text-slate-400 dark:text-zinc-500 text-center text-xs mt-1">¡Empieza a comprar para ganar puntos!</Text>
                        </BlurView>
                    ) : (
                        transactions.map((tx, index) => {
                            const isPositive = ['Earning', 'Referral'].includes(tx.type);
                            return (
                                <View key={tx.id} className="bg-white dark:bg-zinc-900 rounded-[24px] p-4 flex-row justify-between items-center border border-slate-100 dark:border-zinc-800 shadow-sm mb-3">
                                    <View className="flex-row gap-4 items-center flex-1 pr-4">
                                        <View className={`p-3 rounded-2xl ${isPositive ? 'bg-green-100 dark:bg-green-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
                                            {isPositive
                                                ? <ArrowUpRight color={isDark ? "#4ade80" : "#16a34a"} size={22} />
                                                : <ArrowDownRight color={isDark ? "#f87171" : "#dc2626"} size={22} />
                                            }
                                        </View>
                                        <View>
                                            <Text className="font-bold text-base text-slate-900 dark:text-white mb-0.5" numberOfLines={1}>{tx.description}</Text>
                                            <Text className="text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">{tx.date ? new Date(tx.date).toLocaleDateString() : 'Pendiente'}</Text>
                                        </View>
                                    </View>
                                    <Text className={`font-black text-lg ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {isPositive ? '+' : ''}{tx.pointsEarned} <Text className="text-xs font-bold opacity-50">pts</Text>
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
