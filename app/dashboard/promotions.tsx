import { useState, useEffect } from 'react';
import { View, Text, ScrollView, RefreshControl, Image, Share, TouchableOpacity } from 'react-native';
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

const MOCK_PROMOTIONS: Promotion[] = [
    {
        id: '1',
        title: '¡Doble Puntaje este Finde!',
        description: 'Acumula x2 en cada compra superior a $50. Válido sábado y domingo.',
        type: 'featured',
        pointsMultiplier: 2,
        image: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=500',
        category: 'Destacados'
    },
    {
        id: '2',
        title: '20% Off Accesorios',
        description: 'Usa el código QNT-ACC20 en tu próxima compra.',
        type: 'coupon',
        couponCode: 'QNT-ACC20',
        discountPercentage: 20,
        category: 'Moda'
    },
    {
        id: '3',
        title: 'Quantica Tech Day',
        description: 'Sorteos, demos y puntos gratis para asistentes.',
        type: 'event',
        startDate: '2026-04-15',
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=500',
        category: 'Eventos'
    },
    {
        id: '4',
        title: 'Noche de Cócteles VIP',
        description: '2x1 para miembros Gold y Platinum.',
        type: 'featured',
        image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=500',
        category: 'Destacados'
    }
];

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
                // Fallback to Mocks
                setPromotions(MOCK_PROMOTIONS);
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
            setPromotions(MOCK_PROMOTIONS);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
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
                    <View className="px-6 pb-24">
                        {filteredPromos.map(promo => {
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
                        })}
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
        </View>
    );
}
