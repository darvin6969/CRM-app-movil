import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Modal, TouchableOpacity, Vibration, Animated, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Award, ArrowUpRight, ArrowDownRight, AlertCircle, Sparkles, QrCode, ShoppingBag, Tag, ChevronRight, ArrowDownLeft, Bell, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'nativewind';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Customer, Transaction, TIERS } from '../../types';
import { Skeleton, SkeletonCard, SkeletonCircle } from '../../components/Skeleton';
import { AnimatedButton } from '../../components/AnimatedButton';
import { registerForPushNotificationsAsync, savePushToken } from '../../lib/notifications';

const { width } = Dimensions.get('window');

// Variable global en memoria para guardar las promos cerradas durante la sesión activa.
// Esto asegura que si el usuario navega a otra pantalla y vuelve al inicio, 
// no le vuelva a salir. Si cierra la app por completo y la vuelve a abrir, esto se reinicia.
const sessionDismissedPromos = new Set<string>();

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
    
    // Notificación Push Compacta y Pop-up
    const [incomingPush, setIncomingPush] = useState<{ id?: string; title: string; body: string; tier?: string; image_url?: string; action_text?: string; action_url?: string } | null>(null);
    const [showPushToast, setShowPushToast] = useState(false);
    const [showPushPopup, setShowPushPopup] = useState(false);
    const toastAnim = useRef(new Animated.Value(-150)).current;

    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const loadDashboardData = async () => {
        try {
            const { data: { session }, error: authError } = await supabase.auth.getSession();
            
            if (authError || !session) {
                console.log('Sesión inválida o expirada, redirigiendo...');
                await supabase.auth.signOut();
                router.replace('/login');
                return;
            }

            let { data: customerData, error: customerError } = await supabase
                .from('customers')
                .select('*')
                .eq('email', session.user.email)
                .single();

            if (customerError || !customerData) {
                console.log('Cliente no encontrado por Email, intentando por ID...');
                const { data: retryData } = await supabase
                    .from('customers')
                    .select('*')
                    .eq('id', session.user.id)
                    .maybeSingle();
                customerData = retryData;
            }

            if (!customerData) {
                console.log('Cliente no encontrado, permitiendo entrada con perfil básico...');
                setCustomer({
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || 'Usuario',
                    email: session.user.email,
                    loyaltyPoints: 0,
                    tier: 'Bronze',
                    status: 'Activo'
                } as any);
                setIsLoading(false);
                await checkActivePromotion('Bronze');
                return;
            }

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
                
                // --- REGISTRO DE PUSH NOTIFICATIONS AQUÍ ---
                try {
                    const pushToken = await registerForPushNotificationsAsync();
                    if (pushToken) {
                        await savePushToken(pushToken);
                    }
                } catch (pushErr) {
                    console.error('Error in push registration from home:', pushErr);
                }

                await checkActivePromotion(customerData.tier || 'Bronze');
            }
        } catch (err: any) {
            console.error('Error fetching dashboard:', err);
            setError('No pudimos cargar tu información.');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const displayPopup = async (promoData: any) => {
        setIncomingPush({
            id: promoData.id,
            title: promoData.title || '',
            body: promoData.body || '',
            tier: promoData.target_tier,
            image_url: promoData.image_url,
            action_text: promoData.action_text,
            action_url: promoData.action_url
        });
        setShowPushPopup(true);
        if (promoData.id) {
            try {
                await supabase.rpc('increment_promo_view', { promo_id: promoData.id });
            } catch (e) {
                console.log('No se pudo incrementar las vistas (RPC no disponible o error)');
            }
        }
    };

    const checkActivePromotion = async (userTier: string) => {
        try {
            const now = new Date().toISOString();
            // Obtener la promoción más reciente con imagen activa (no expirada y que ya inició)
            const { data, error } = await supabase
                .from('push_notifications')
                .select('*')
                .not('image_url', 'is', null)
                .or(`expires_at.is.null,expires_at.gt.${now}`)
                .or(`start_date.is.null,start_date.lte.${now}`)
                .order('created_at', { ascending: false })
                .limit(20); // Consultamos varias para poder filtrar por cumpleaños

            if (error) {
                console.error('Error al obtener promoción activa:', error);
                return;
            }

            if (data && data.length > 0) {
                const today = new Date();
                const isBirthday = customer?.birth_date && new Date(customer.birth_date).getMonth() === today.getMonth() && new Date(customer.birth_date).getDate() === today.getDate();
                
                const promo = data.find((p: any) => p.target_tier === 'Todos' || p.target_tier === userTier || (p.target_tier === 'Cumpleañeros' && isBirthday));
                
                if (promo && !sessionDismissedPromos.has(promo.id)) {
                    displayPopup(promo);
                }
            }
        } catch (e) {
            console.error('Error en checkActivePromotion:', e);
        }
    };

    const showNotification = (data: any) => {
        if (data.image_url) {
            displayPopup(data);
            Vibration.vibrate([0, 200, 100, 200]);
        } else {
            setIncomingPush({ 
                id: data.id,
                title: data.title, 
                body: data.body,
                tier: data.target_tier
            });
            setShowPushToast(true);
            Vibration.vibrate([0, 100, 100, 100]);

            // Animación de entrada
            Animated.spring(toastAnim, {
                toValue: 20,
                useNativeDriver: true,
                bounciness: 12
            }).start();

            // Ocultar después de 6 segundos
            setTimeout(() => {
                hideNotification();
            }, 6000);
        }
    };

    const hideNotification = () => {
        Animated.timing(toastAnim, {
            toValue: -150,
            duration: 500,
            useNativeDriver: true
        }).start(() => {
            setShowPushToast(false);
            setIncomingPush(null);
        });
    };

    const hidePopup = () => {
        if (incomingPush?.id) {
            sessionDismissedPromos.add(incomingPush.id);
        }
        setShowPushPopup(false);
        setIncomingPush(null);
    };

    useFocusEffect(
        useCallback(() => {
            loadDashboardData();
        }, [])
    );

    useEffect(() => {

        const pushSubscription = supabase
            .channel('any-filter')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'push_notifications' },
                (payload) => {
                    const newPush = payload.new;
                    const targetTier = newPush.target_tier;
                    const now = new Date();
                    const isFuture = newPush.start_date && new Date(newPush.start_date) > now;
                    
                    if (isFuture) return;

                    const isBirthday = customer?.birth_date && new Date(customer.birth_date).getMonth() === now.getMonth() && new Date(customer.birth_date).getDate() === now.getDate();
                    if (targetTier === 'Todos' || (customer && targetTier === customer.tier) || (targetTier === 'Cumpleañeros' && isBirthday)) {
                        showNotification(newPush);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(pushSubscription);
        };
    }, [customer?.tier, customer?.birth_date]);

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

    const firstName = (customer.name || 'Cliente').split(' ')[0];
    const initials = (customer.name || 'CL').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return (
        <SafeAreaView className="flex-1 bg-slate-50 dark:bg-black">
            <LinearGradient
                colors={isDark ? ['#4c1d95', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />

            {/* NOTIFICACIÓN TIPO TOAST (COMPACTA) */}
            {showPushToast && (
                <Animated.View 
                    style={{ 
                        transform: [{ translateY: toastAnim }],
                        position: 'absolute',
                        top: 40,
                        left: 16,
                        right: 16,
                        zIndex: 9999,
                        // Sombra profunda para despegarlo del fondo
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.5,
                        shadowRadius: 15,
                        elevation: 20,
                    }}
                >
                    <TouchableOpacity activeOpacity={0.95} onPress={hideNotification}>
                        <View className={`rounded-[28px] border-2 flex-row items-center p-5 ${
                            isDark ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-100'
                        }`}>
                            <View className={`w-1.5 absolute left-0 top-4 bottom-4 rounded-full ${
                                incomingPush?.tier === 'Gold' ? 'bg-amber-400' : 'bg-blue-500'
                            }`} />
                            
                            <View className={`p-3 rounded-2xl mr-4 ${
                                incomingPush?.tier === 'Gold' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                            }`}>
                                <Bell color={incomingPush?.tier === 'Gold' ? '#fbbf24' : '#3b82f6'} size={24} />
                            </View>

                            <View className="flex-1">
                                <Text className={`text-[9px] font-black uppercase tracking-[2px] mb-1 ${
                                    isDark ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                    NOTIFICACIÓN DEL SISTEMA
                                </Text>
                                <Text className={`text-base font-black tracking-tight mb-0.5 ${
                                    isDark ? 'text-white' : 'text-slate-900'
                                }`} numberOfLines={1}>
                                    {incomingPush?.title}
                                </Text>
                                <Text className={`text-sm font-bold leading-5 ${
                                    isDark ? 'text-slate-300' : 'text-slate-600'
                                }`} numberOfLines={2}>
                                    {incomingPush?.body}
                                </Text>
                            </View>

                            <View className="ml-2 bg-slate-100 dark:bg-white/5 p-2 rounded-full">
                                <X color={isDark ? "white" : "black"} size={14} opacity={0.5} />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#a78bfa" : "#8b5cf6"} />}
            >
                <TouchableOpacity 
                    activeOpacity={0.7} 
                    onPress={() => router.push('/dashboard/profile' as any)}
                    className="flex-row justify-between items-center mb-6 mt-2"
                >
                    <View>
                        <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-black tracking-[2px] uppercase mb-1">HOLA DE NUEVO,</Text>
                        <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{firstName.toLowerCase()}</Text>
                    </View>
                    <View className="bg-[#f3f0ff] p-2 rounded-full h-12 w-12 items-center justify-center border border-primary/5">
                        <Text className="text-primary font-bold text-base uppercase">{initials}</Text>
                    </View>
                </TouchableOpacity>

                <AnimatedButton activeScale={0.98} onPress={() => router.push('/points-history')}>
                    <LinearGradient 
                        colors={['#7c3aed', '#5b21b6']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }}
                        className="rounded-[40px] p-8 shadow-2xl shadow-primary/30 mb-8 overflow-hidden relative"
                    >
                        <View className="absolute top-0 right-0 opacity-10">
                            <Sparkles color="white" size={200} />
                        </View>
                        <View className="absolute -bottom-10 -left-10 opacity-10 transform -rotate-12">
                            <Award color="white" size={150} />
                        </View>

                        <View className="flex-row justify-between items-start mb-6 z-10">
                            <View className="px-4 py-1.5 rounded-full border border-white/20 overflow-hidden">
                                <Text className="text-white text-[9px] font-black tracking-widest uppercase">Nivel {customer.tier.toUpperCase()}</Text>
                            </View>
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

                <View className="flex-row justify-between gap-x-3 gap-y-3 flex-wrap mb-8">
                    {[
                        { icon: QrCode, label: "Mi QR", sub: "Ver", color: "#8b5cf6", bg: "bg-purple-500/10", route: '/dashboard/profile' },
                        { icon: ShoppingBag, label: "Premios", sub: "Ver", color: "#3b82f6", bg: "bg-blue-500/10", route: '/dashboard/catalog' },
                        { icon: Tag, label: "Ofertas", sub: "Ver", color: "#f59e0b", bg: "bg-amber-500/10", route: '/dashboard/promotions' },
                        { icon: Award, label: "Niveles", sub: "Ver", color: "#10b981", bg: "bg-emerald-500/10", route: '/tiers' },
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
                        transactions.map((tx) => (
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
                                    <Text className={`font-black text-lg ${['Earning', 'Referral'].includes(tx.type) ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {['Earning', 'Referral'].includes(tx.type) ? '+' : ''}{tx.pointsEarned} <Text className="text-xs font-bold opacity-50">pts</Text>
                                    </Text>
                                </View>
                            </AnimatedButton>
                        ))
                    )}
                </View>
            </ScrollView>

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
                                <ArrowDownLeft color="red" size={40} />
                            </View>
                            <Text className="text-2xl font-black text-slate-900 dark:text-white text-center uppercase tracking-tight mb-2">Detalle de Actividad</Text>
                            <View className="w-full bg-slate-50 dark:bg-white/5 rounded-3xl p-6 border border-slate-100 dark:border-white/5 mb-8">
                                <Text className="text-slate-900 dark:text-white font-bold text-center">{selectedTx?.description}</Text>
                                <Text className="text-red-500 font-extrabold text-2xl text-center mt-2">-{selectedTx?.pointsEarned} PTS</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowDetailModal(false)} className="w-full bg-slate-900 dark:bg-white h-16 rounded-[24px] items-center justify-center">
                                <Text className="text-white dark:text-slate-900 font-black">ENTENDIDO</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* POPUP DE PROMOCIONES CON IMAGEN */}
            <Modal
                visible={showPushPopup}
                transparent={true}
                animationType="fade"
                onRequestClose={hidePopup}
            >
                <TouchableOpacity 
                    className="flex-1 bg-black/85 items-center justify-center p-6"
                    activeOpacity={1}
                    onPress={hidePopup}
                >
                    <TouchableOpacity activeOpacity={1} onPress={() => {}} className="w-full max-w-[340px]">
                        <View className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 relative">
                            {incomingPush?.image_url && (
                                <Image 
                                    source={{ uri: incomingPush.image_url }} 
                                    className="w-full h-[320px]"
                                    resizeMode="cover"
                                />
                            )}
                            
                            <TouchableOpacity 
                                onPress={hidePopup} 
                                style={{ 
                                    position: 'absolute', 
                                    top: 16, 
                                    right: 16, 
                                    zIndex: 10, 
                                    backgroundColor: 'rgba(0,0,0,0.5)', 
                                    padding: 8, 
                                    borderRadius: 99 
                                }}
                            >
                                <X color="white" size={16} />
                            </TouchableOpacity>

                            {((incomingPush?.title && incomingPush.title.trim() !== '') || (incomingPush?.body && incomingPush.body.trim() !== '') || (incomingPush?.action_text && incomingPush.action_text.trim() !== '')) ? (
                                <View className="p-6">
                                    <Text className="text-[9px] font-black uppercase tracking-[2px] mb-2 text-primary">
                                        {incomingPush?.tier === 'Cumpleañeros' ? '¡FELIZ CUMPLEAÑOS!' : 'NUEVA PROMOCIÓN'}
                                    </Text>
                                    {incomingPush?.title && incomingPush.title.trim() !== '' && (
                                        <Text className="text-xl font-black tracking-tight mb-2 text-slate-900 dark:text-white leading-tight">
                                            {incomingPush.title}
                                        </Text>
                                    )}
                                    {incomingPush?.body && incomingPush.body.trim() !== '' && (
                                        <Text className="text-sm font-bold text-slate-500 dark:text-zinc-400 leading-5">
                                            {incomingPush.body}
                                        </Text>
                                    )}
                                    {incomingPush?.action_text && incomingPush.action_text.trim() !== '' && (
                                        <TouchableOpacity 
                                            className="mt-4 w-full bg-violet-600 py-3.5 rounded-xl items-center justify-center shadow-lg shadow-violet-600/30"
                                            onPress={() => {
                                                if (incomingPush.action_url) {
                                                    import('react-native').then(({ Linking }) => {
                                                        Linking.openURL(incomingPush.action_url!).catch(err => console.error("Error opening URL", err));
                                                    });
                                                }
                                            }}
                                        >
                                            <Text className="text-white font-black text-sm uppercase tracking-wider">{incomingPush.action_text}</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : null}
                        </View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}
