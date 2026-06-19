import { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Image, Share, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, Calendar, Tag, Sparkles, Rocket, Clock, ChevronRight, Copy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../../lib/supabase';
import { Promotion } from '../../types';
import { Skeleton } from '../../components/Skeleton';
import { AnimatedButton } from '../../components/AnimatedButton';
import { SuccessOverlay } from '../../components/SuccessOverlay';
import { AlertModal } from '../../components/AlertModal';

// Removemos los datos de ejemplo

const CATEGORIES = ['Todo', 'Destacados', 'Cupones', 'Eventos', 'Moda', 'Tech'];

export default function PromotionsScreen() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [activeCategory, setActiveCategory] = useState('Todo');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [promoCodeInput, setPromoCodeInput] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'info' | 'warning' | 'error' | 'success';
    }>({
        visible: false,
        title: '',
        message: '',
        type: 'info'
    });

    const loadData = async () => {
        try {
            // Attempt Supabase fetch
            const { data, error } = await supabase
                .from('promotions')
                .select('*')
                .order('created_at', { ascending: false });

            if (error || !data || data.length === 0) {
                setPromotions([]);
            } else {
                setPromotions(data.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    type: p.type,
                    couponCode: p.coupon_code,
                    image: p.image_url,
                    category: p.category
                })));
            }
        } catch (e) {
            setPromotions([]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.email) {
                const { data } = await supabase.from('customers').select('*').eq('email', session.user.email).single();
                if (data) setCurrentUser(data);
            }
        };
        fetchUser();
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleCopy = (code: string) => {
        setAlertConfig({
            visible: true,
            title: "Código Copiado",
            message: `El código ${code} se ha copiado al portapapeles. ¡Úsalo en tu próxima compra!`,
            type: 'success'
        });
    };

    const handleRedeem = async () => {
        const code = promoCodeInput.trim().toUpperCase();
        if (!code) return;
        if (!currentUser) return setAlertConfig({ visible: true, title: 'Error', message: 'No se pudo identificar tu usuario. Por favor reinicia la app.', type: 'error' });

        setIsRedeeming(true);
        try {
            // 1. Fetch promo code
            const { data: promo, error: promoError } = await supabase
                .from('promo_codes')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .single();

            if (promoError || !promo) {
                throw new Error('Código inválido o inactivo.');
            }

            // 2. Check expiration
            if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
                throw new Error('Este código ya ha expirado.');
            }

            // 3. Check global limits
            if (promo.max_uses && promo.times_used >= promo.max_uses) {
                throw new Error('Este código ha alcanzado el límite máximo de usos.');
            }

            // 4. Check one-time use per customer
            if (promo.is_one_time) {
                const { data: usage } = await supabase
                    .from('promo_usages')
                    .select('id')
                    .eq('promo_code_id', promo.id)
                    .eq('customer_id', currentUser.id)
                    .single();
                
                if (usage) {
                    throw new Error('Ya has canjeado este código anteriormente.');
                }
            }

            // 5. Apply reward
            const { error: insertUsageError } = await supabase.from('promo_usages').insert([{
                promo_code_id: promo.id,
                customer_id: currentUser.id,
                customer_name: currentUser.name
            }]);
            if (insertUsageError) throw new Error('Error al registrar uso. Inténtalo de nuevo.');

            // Update times used
            await supabase.from('promo_codes').update({ times_used: promo.times_used + 1 }).eq('id', promo.id);

            // Update points
            const newPoints = (currentUser.points || 0) + promo.reward_points;
            await supabase.from('customers').update({ points: newPoints }).eq('id', currentUser.id);

            // Insert points history
            await supabase.from('points_history').insert([{
                customer_id: currentUser.id,
                points_change: promo.reward_points,
                reason: `Canje de código: ${code}`,
                type: 'earned'
            }]);

            // Actualizar estado local
            setCurrentUser({ ...currentUser, points: newPoints });
            setSuccessMsg(`¡Felicidades! Has ganado ${promo.reward_points} puntos.`);
            setShowSuccess(true);
            setPromoCodeInput('');
            
        } catch (error: any) {
            setAlertConfig({
                visible: true,
                title: 'No se pudo canjear',
                message: error.message || 'Error al procesar el código',
                type: 'warning'
            });
        } finally {
            setIsRedeeming(false);
        }
    };

    const filteredPromos = promotions.filter(p => 
        activeCategory === 'Todo' || 
        p.category === activeCategory || 
        (activeCategory === 'Destacados' && p.type === 'featured') ||
        (activeCategory === 'Cupones' && p.type === 'coupon') ||
        (activeCategory === 'Eventos' && p.type === 'event')
    );

    const featuredPromos = promotions.filter(p => p.type === 'featured');

    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#4c1d95', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                <View className="px-6 pt-6 pb-2">
                    <Text className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Ofertas</Text>
                    <Text className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-[4px] mt-1">Beneficios Quantica</Text>
                </View>

                {/* Redeem Section */}
                <View className="px-6 mb-6 mt-2 z-10">
                    <BlurView 
                        intensity={isDark ? 20 : 60} 
                        tint={isDark ? "dark" : "light"}
                        className="rounded-[32px] p-6 border border-white/20 dark:border-white/10 shadow-lg"
                    >
                        <Text className="text-slate-900 dark:text-white font-black text-lg mb-4">¿Tienes un código?</Text>
                        <View className="flex-row items-center gap-x-3">
                            <View className="flex-1 bg-black/5 dark:bg-white/5 rounded-2xl h-14 justify-center px-5 border border-black/5 dark:border-white/5">
                                <TextInput
                                    className="text-slate-900 dark:text-white font-bold text-base uppercase"
                                    placeholder="Escribe aquí..."
                                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                    value={promoCodeInput}
                                    onChangeText={setPromoCodeInput}
                                    autoCapitalize="characters"
                                    editable={!isRedeeming}
                                />
                            </View>
                            <TouchableOpacity 
                                onPress={handleRedeem}
                                disabled={isRedeeming || !promoCodeInput.trim()}
                                className={`h-14 px-6 rounded-2xl justify-center items-center shadow-lg transition-all ${isRedeeming || !promoCodeInput.trim() ? 'bg-primary/50' : 'bg-primary shadow-primary/30'}`}
                            >
                                {isRedeeming ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text className="text-white font-black uppercase text-xs tracking-widest">Canjear</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </View>

                {/* Categories Scroll */}
                <View className="mb-4">
                    <ScrollView 
                        horizontal 
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12 }}
                    >
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity 
                                key={cat}
                                onPress={() => setActiveCategory(cat)}
                                className={`mr-3 px-6 py-2.5 rounded-full border ${activeCategory === cat ? 'bg-primary border-primary' : 'bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10'}`}
                            >
                                <Text className={`font-black text-[10px] uppercase tracking-widest ${activeCategory === cat ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#a78bfa" : "#8b5cf6"} />}
                >
                    {/* Featured Carousel */}
                    {activeCategory === 'Todo' && featuredPromos.length > 0 && (
                        <View className="mb-8">
                            <ScrollView 
                                horizontal 
                                pagingEnabled
                                nestedScrollEnabled
                                showsHorizontalScrollIndicator={false}
                                scrollEventThrottle={16}
                                decelerationRate="fast"
                                snapToInterval={320} // Approximate width for better snapping
                                contentContainerStyle={{ paddingHorizontal: 24 }}
                            >
                                {featuredPromos.map(promo => (
                                    <AnimatedButton key={promo.id} className="w-[85vw] mr-4 overflow-hidden rounded-[44px]">
                                        <LinearGradient
                                            colors={['#8b5cf6', '#4c1d95']}
                                            className="p-8 h-64 justify-end relative"
                                        >
                                            {promo.image && (
                                                <Image 
                                                    source={{ uri: promo.image }} 
                                                    className="absolute inset-0 opacity-40"
                                                    style={{ resizeMode: 'cover' }}
                                                />
                                            )}
                                            <View className="absolute top-6 right-6 bg-white/20 p-2 rounded-xl">
                                                <Rocket color="white" size={20} />
                                            </View>
                                            <Text className="text-white text-3xl font-black leading-tight tracking-tighter mb-2">
                                                {promo.title}
                                            </Text>
                                            <Text className="text-white/80 font-bold text-xs" numberOfLines={2}>
                                                {promo.description}
                                            </Text>
                                        </LinearGradient>
                                    </AnimatedButton>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Promotions List */}
                    <View className="px-6 pb-24 mt-4">
                        {isLoading ? (
                            <View className="mt-2">
                                <View className="mb-6"><Skeleton width="100%" height={110} style={{ borderRadius: 36 }} isDark={isDark} /></View>
                                <View className="mb-6"><Skeleton width="100%" height={110} style={{ borderRadius: 36 }} isDark={isDark} /></View>
                                <View className="mb-6"><Skeleton width="100%" height={110} style={{ borderRadius: 36 }} isDark={isDark} /></View>
                            </View>
                        ) : filteredPromos.length === 0 ? (
                            <View className="items-center justify-center py-10 mt-8">
                                <View className="bg-primary/10 dark:bg-primary/20 p-6 rounded-full mb-6 border border-primary/20">
                                    <Gift size={48} color={isDark ? "#a78bfa" : "#8b5cf6"} strokeWidth={1.5} />
                                </View>
                                <Text className="text-slate-900 dark:text-white font-black text-xl mb-3 text-center tracking-tight">
                                    Pronto habrán sorpresas
                                </Text>
                                <Text className="text-slate-500 dark:text-slate-400 text-sm text-center px-6 leading-6 font-medium">
                                    Estamos preparando cupones y descuentos exclusivos. ¡Mantente atento a tus notificaciones!
                                </Text>
                            </View>
                        ) : (
                            filteredPromos.map(promo => {
                                if (activeCategory === 'Todo' && promo.type === 'featured') return null;
                                
                                return (
                                    <AnimatedButton key={promo.id} className="mb-6">
                                        <BlurView 
                                            intensity={isDark ? 20 : 60} 
                                            tint={isDark ? "dark" : "light"}
                                            className="rounded-[36px] overflow-hidden border border-white/20 dark:border-white/10 shadow-lg"
                                        >
                                            <View className="flex-row items-center p-6">
                                                {/* Icon/Image Box */}
                                                <View className="bg-primary/10 dark:bg-primary/20 p-5 rounded-[24px] mr-5">
                                                    {promo.type === 'coupon' ? (
                                                        <Tag color="#8b5cf6" size={28} />
                                                    ) : promo.type === 'event' ? (
                                                        <Calendar color="#8b5cf6" size={28} />
                                                    ) : (
                                                        <Sparkles color="#8b5cf6" size={28} />
                                                    )}
                                                </View>

                                                <View className="flex-1">
                                                    <View className="flex-row items-center mb-1">
                                                        <Clock color={isDark ? "#94a3b8" : "#64748b"} size={10} className="mr-1" />
                                                        <Text className="text-slate-400 dark:text-slate-500 font-bold text-[8px] uppercase tracking-widest">Oferta Limitada</Text>
                                                    </View>
                                                    <Text className="text-slate-900 dark:text-white font-black text-xl tracking-tight leading-tight mb-1">
                                                        {promo.title}
                                                    </Text>
                                                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-medium leading-4" numberOfLines={2}>
                                                        {promo.description}
                                                    </Text>
                                                </View>

                                                {promo.type === 'coupon' ? (
                                                    <TouchableOpacity 
                                                        onPress={() => handleCopy(promo.couponCode || '')}
                                                        className="bg-primary shadow-lg shadow-primary/20 p-3.5 rounded-2xl ml-2"
                                                    >
                                                        <Copy color="white" size={16} />
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View className="bg-slate-100 dark:bg-white/5 p-3 rounded-2xl ml-2">
                                                        <ChevronRight color={isDark ? "#94a3b8" : "#64748b"} size={20} />
                                                    </View>
                                                )}
                                            </View>
                                        </BlurView>
                                    </AnimatedButton>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>

            <AlertModal 
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
                isDark={isDark}
            />

            <SuccessOverlay 
                visible={showSuccess}
                title="¡Código Canjeado!"
                message={successMsg}
                onClose={() => setShowSuccess(false)}
                isDark={isDark}
            />
        </View>
    );
}
