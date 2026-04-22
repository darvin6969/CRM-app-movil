import { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Award, ArrowUpRight, ArrowDownRight, AlertCircle, Sparkles, QrCode, ShoppingBag, Tag, ChevronRight, ArrowDownLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { useRouter } from 'expo-router';
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
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
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
                    referralCode: customerData.referral_code || session.user.email?.split('@')[0].toUpperCase() || 'GUEST',
                    joinDate: customerData.join_date,
                    transactions: [],
                    tier: customerData.tier || 'Bronze',
                    status: customerData.status || 'Activo',
                    phone: customerData.phone || ''
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
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0];
    const initials = nameParts.length > 1 
        ? (nameParts[0][0] + nameParts[1][0]).toUpperCase()
        : nameParts[0].substring(0, 2).toUpperCase();

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black">
            <LinearGradient
                colors={isDark ? ['#4c1d95', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#a78bfa" : "#8b5cf6"} />}
            >
                {/* Header */}
                <View className="flex-row justify-between items-center mb-6 mt-2">
                    <View>
                        <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-black tracking-[2px] uppercase mb-1">HOLA DE NUEVO,</Text>
                        <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{firstName.toLowerCase()}</Text>
                    </View>
                    <View className="bg-[#f3f0ff] p-2 rounded-full h-12 w-12 items-center justify-center border border-primary/5">
                        <Text className="text-primary font-bold text-base uppercase">{initials}</Text>
                    </View>
                </View>

                {/* Loyalty Card */}
                <AnimatedButton activeScale={0.98} onPress={() => router.push('/points-history')}>
                    <LinearGradient 
                        colors={['#7c3aed', '#5b21b6']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }}
                        className="rounded-[40px] p-8 shadow-2xl shadow-primary/30 mb-8 overflow-hidden relative"
                    >
                        {/* Decorative Patterns */}
                        <View className="absolute top-0 right-0 opacity-10">
                            <Sparkles color="white" size={200} />
                        </View>
                        <View className="absolute -bottom-10 -left-10 opacity-10 transform -rotate-12">
                            <Award color="white" size={150} />
                        </View>

                        <View className="flex-row justify-between items-start mb-6 z-10">
                            <TouchableOpacity onPress={() => router.push('/tiers')}>
                                <BlurView intensity={20} tint="light" className="px-4 py-1.5 rounded-full border border-white/20 overflow-hidden">
                                    <Text className="text-white text-[9px] font-black tracking-widest uppercase">Nivel {customer.tier.toUpperCase()}</Text>
                                </BlurView>
                            </TouchableOpacity>
                            <View className="bg-white/20 p-2.5 rounded-2xl border border-white/10">
                                <Award color="white" size={24} />
                            </View>
                        </View>

                        <Text className="text-white/60 text-[10px] font-black mb-0.5 uppercase tracking-widest z-10">Puntos Disponibles</Text>
                        <View className="flex-row items-baseline z-10">
                            <Text className="text-white text-6xl font-black tracking-tighter">{customer.loyaltyPoints}</Text>
                            <Text className="text-white/30 text-lg font-black ml-2 uppercase tracking-tighter">pts</Text>
                        </View>

                        <View className="mt-5 z-10">
                            <View className="flex-row justify-between items-end mb-2">
                                <Text className="text-white/80 text-[9px] font-black uppercase tracking-tight">Próximo: Silver</Text>
                                <Text className="text-white text-[9px] font-black">400/1000</Text>
                            </View>
                            <View className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden border border-white/5">
                                <View className="bg-white h-full rounded-full shadow-lg" style={{ width: `40%` }} />
                            </View>
                        </View>
                    </LinearGradient>
                </AnimatedButton>

                {/* Vanguard Quick Actions Grid */}
                <View className="flex-row justify-between gap-x-3 gap-y-3 flex-wrap mb-8">
                    {[
                        { icon: QrCode, label: "Mi QR", sub: "Ver", color: "#8b5cf6", bg: "bg-purple-500/10", route: '/dashboard/profile' },
                        { icon: ShoppingBag, label: "Premios", sub: "Ver", color: "#3b82f6", bg: "bg-blue-500/10", route: '/dashboard/catalog' },
                        { icon: Tag, label: "Ofertas", sub: "Ver", color: "#f59e0b", bg: "bg-amber-500/10", route: '/dashboard/promotions' },
                        { icon: Award, label: "Tiers", sub: "Ver", color: "#10b981", bg: "bg-emerald-500/10", route: '/tiers' },
                    ].map((item, idx) => (
                        <AnimatedButton 
                            key={idx} 
                            className="w-[48%]"
                            onPress={() => item.route && router.push(item.route as any)}
                        >
                            <BlurView intensity={isDark ? 15 : 40} tint={isDark ? "dark" : "light"} className="p-4 rounded-[28px] border border-white/20 dark:border-white/10 overflow-hidden flex-row items-center gap-3 shadow-sm">
                                <View className={`${item.bg} p-2.5 rounded-2xl`}>
                                    <item.icon color={item.color} size={18} />
                                </View>
                                <View>
                                    <Text className="text-slate-900 dark:text-white font-black text-xs tracking-tight">{item.label}</Text>
                                    <Text className="text-slate-400 font-bold text-[8px] uppercase tracking-widest">{item.sub}</Text>
                                </View>
                            </BlurView>
                        </AnimatedButton>
                    ))}
                </View>
                {/* Recent Transactions */}
                <View className="flex-row justify-between items-center mb-5 mt-2">
                    <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex-1" numberOfLines={1}>Actividad Reciente</Text>
                    <TouchableOpacity onPress={() => router.push('/points-history')} className="ml-4">
                        <Text className="text-primary font-black text-[10px] uppercase tracking-widest px-2">Ver todo</Text>
                    </TouchableOpacity>
                </View>
                
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
                                <AnimatedButton 
                                    key={tx.id} 
                                    activeScale={0.97} 
                                    className="mb-1"
                                    onPress={() => {
                                        setSelectedTx(tx);
                                        setShowDetailModal(true);
                                    }}
                                >
                                    <View className="bg-white dark:bg-zinc-900 rounded-[24px] p-4 flex-row justify-between items-center border border-slate-100 dark:border-zinc-800 shadow-sm">
                                        <View className="flex-row gap-4 items-center flex-1 pr-4">
                                            <View>
                                                <Text className="font-bold text-base text-slate-900 dark:text-white mb-0.5" numberOfLines={1}>{tx.description}</Text>
                                                <Text className="text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">{tx.date ? new Date(tx.date).toLocaleDateString() : 'Pendiente'}</Text>
                                            </View>
                                        </View>
                                        <Text className={`font-black text-lg ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                            {isPositive ? '+' : ''}{tx.pointsEarned} <Text className="text-xs font-bold opacity-50">pts</Text>
                                        </Text>
                                    </View>
                                </AnimatedButton>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Transaction Detail Modal */}
            <Modal
                visible={showDetailModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View className="flex-1 bg-black/70 items-center justify-center p-6">
                    <View className="w-full bg-white dark:bg-zinc-900 rounded-[40px] p-8 overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5">
                        <View className="items-center">
                            <View className="w-20 h-20 bg-red-50 rounded-3xl items-center justify-center mb-6 shadow-xl shadow-red-500/20">
                                <ArrowDownLeft color="white" size={40} />
                            </View>
                            
                            <Text className="text-2xl font-black text-slate-900 dark:text-white text-center uppercase tracking-tight mb-2">Detalle de Actividad</Text>
                            <Text className="text-slate-500 dark:text-zinc-400 text-center text-sm leading-5 mb-8">
                                Informaci&oacute;n detallada de tu transacci&oacute;n y progreso de lealtad.
                            </Text>

                            <View className="w-full bg-slate-50 dark:bg-white/5 rounded-3xl p-6 border border-slate-100 dark:border-white/5 mb-8">
                                <View className="flex-row justify-between mb-4">
                                    <Text className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">T&iacute;tulo</Text>
                                    <Text className="text-slate-900 dark:text-white font-bold text-sm text-right flex-1 ml-4">{selectedTx?.description}</Text>
                                </View>
                                <View className="flex-row justify-between mb-4">
                                    <Text className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Valor</Text>
                                    <Text className="text-red-500 font-extrabold text-xl">-{selectedTx?.pointsEarned} PTS</Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-slate-400 dark:text-zinc-500 text-[10px] font-black uppercase tracking-widest">Fecha</Text>
                                    <Text className="text-slate-900 dark:text-white font-bold text-sm">{selectedTx?.date ? new Date(selectedTx.date).toLocaleDateString() : 'Hoy'}</Text>
                                </View>
                            </View>

                            <View className="w-full bg-primary/5 dark:bg-primary/20 rounded-3xl p-6 border border-primary/10 mb-10">
                                <Text className="text-primary font-black text-[10px] uppercase tracking-widest mb-3 text-center">Progreso para Silver</Text>
                                <Text className="text-slate-600 dark:text-white/80 text-center text-xs mb-4">
                                    Te faltan {1000 - 400} puntos para subir de nivel.
                                </Text>
                                <View className="w-full bg-slate-200 dark:bg-black/40 h-2 rounded-full overflow-hidden">
                                    <View className="bg-primary h-full rounded-full" style={{ width: `40%` }} />
                                </View>
                            </View>

                            <TouchableOpacity 
                                onPress={() => setShowDetailModal(false)}
                                className="w-full bg-slate-900 dark:bg-white h-16 rounded-[24px] items-center justify-center shadow-xl shadow-black/20"
                            >
                                <Text className="text-white dark:text-slate-900 font-black text-lg uppercase tracking-widest">Entendido</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
