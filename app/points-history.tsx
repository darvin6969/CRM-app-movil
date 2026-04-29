import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, TrendingUp, TrendingDown, Clock, Filter, Search, Award, ShoppingBag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { Transaction } from '../types';
import { AnimatedButton } from '../components/AnimatedButton';

const CATEGORIES = ['Todo', 'Ganados', 'Canjeados'];

export default function PointsHistoryScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const [activeFilter, setActiveFilter] = useState('Todo');
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalEarned, setTotalEarned] = useState(0);

    const loadData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                // In a real app, we'd join with customers to get customerId, 
                // but here we assume 'transactions' has user_id or we filter by customer
                // Let's first get the customer profile to get the customer ID
                const { data: customer } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('email', session.user.email)
                    .single();

                if (customer) {
                    const { data, error } = await supabase
                        .from('transactions')
                        .select('*')
                        .eq('customer_id', customer.id)
                        .order('date', { ascending: false });

                    if (error) throw error;
                    
                    const mappedData = data.map((t: any) => ({
                        id: t.id,
                        customerId: t.customer_id,
                        amount: t.amount,
                        pointsEarned: t.points_earned,
                        date: t.date,
                        description: t.description,
                        type: t.type
                    }));

                    setTransactions(mappedData);
                    setFilteredTransactions(mappedData);

                    // Calculate total earned
                    const earned = mappedData
                        .filter((t: any) => t.type !== 'Redemption')
                        .reduce((acc: number, t: any) => acc + t.pointsEarned, 0);
                    setTotalEarned(earned);
                }
            }
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (activeFilter === 'Todo') {
            setFilteredTransactions(transactions);
        } else if (activeFilter === 'Ganados') {
            setFilteredTransactions(transactions.filter(t => t.type !== 'Redemption'));
        } else {
            setFilteredTransactions(transactions.filter(t => t.type === 'Redemption'));
        }
    }, [activeFilter, transactions]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const renderItem = ({ item }: { item: Transaction }) => {
        const isRedemption = item.type === 'Redemption';
        const date = new Date(item.date).toLocaleDateString();
        const time = new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <AnimatedButton activeScale={0.98} className="mb-4">
                <BlurView 
                    intensity={isDark ? 20 : 40}
                    tint={isDark ? "dark" : "light"}
                    className="rounded-[32px] overflow-hidden border border-white/20 dark:border-white/10 shadow-lg"
                >
                    <View className="p-5 flex-row items-center">

                        
                        <View className="flex-1">
                            <View className="flex-row items-center mb-1">
                                <Clock color={isDark ? "#94a3b8" : "#64748b"} size={10} className="mr-1" />
                                <Text className="text-slate-400 dark:text-slate-500 font-bold text-[8px] uppercase tracking-widest">{date} • {time}</Text>
                            </View>
                            <Text className="text-slate-900 dark:text-white font-black text-base tracking-tight leading-tight">
                                {item.description}
                            </Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-medium uppercase tracking-wider mt-0.5">
                                {item.type}
                            </Text>
                        </View>

                        <View className="items-end">
                            <Text className={`font-black text-lg ${isRedemption ? 'text-red-500' : 'text-green-500'}`}>
                                {isRedemption ? '-' : '+'}{Math.abs(item.pointsEarned)}
                            </Text>
                            <Text className="text-slate-400 dark:text-slate-500 font-bold text-[8px] uppercase">pts</Text>
                        </View>
                    </View>
                </BlurView>
            </AnimatedButton>
        );
    };

    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#4c1d95', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="px-6 py-4 flex-row items-center justify-between mt-2">
                    <View className="flex-row items-center">
                        <TouchableOpacity 
                            onPress={() => router.back()} 
                            className="mr-4 bg-white/20 dark:bg-black/20 p-3 rounded-2xl border border-white/20"
                        >
                            <ChevronLeft color={isDark ? "white" : "black"} size={22} />
                        </TouchableOpacity>
                        <View>
                            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Historial</Text>
                            <Text className="text-slate-500 dark:text-slate-400 font-medium uppercase text-[10px] tracking-widest mt-0.5">Movimientos de Puntos</Text>
                        </View>
                    </View>
                    
                    <View className="bg-primary/20 p-3 rounded-2xl">
                        <Award color="#8b5cf6" size={24} />
                    </View>
                </View>

                {/* Summary Score */}
                <View className="px-6 mt-4">
                    <BlurView 
                        intensity={isDark ? 30 : 60} 
                        tint={isDark ? "dark" : "light"}
                        className="rounded-[40px] p-8 border border-white/30 dark:border-white/10 shadow-2xl overflow-hidden"
                    >
                        <LinearGradient
                            colors={['#8b5cf6', '#4c1d95']}
                            className="absolute inset-0 opacity-10"
                        />
                        <View className="items-center">
                            <Text className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-[4px] mb-2">Total Ganados</Text>
                            <Text className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
                                {totalEarned.toLocaleString()}
                            </Text>
                            <View className="flex-row items-center bg-green-500/20 px-4 py-1.5 rounded-full mt-4">
                                <TrendingUp color="#22c55e" size={12} />
                                <Text className="text-green-600 dark:text-green-400 font-black text-[10px] uppercase ml-2 tracking-widest">Saldo Positivo</Text>
                            </View>
                        </View>
                    </BlurView>
                </View>

                {/* Filters */}
                <View className="mt-8 mb-4">
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 24 }}
                    >
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity 
                                key={cat}
                                onPress={() => setActiveFilter(cat)}
                                className={`mr-3 px-6 py-2.5 rounded-full border ${activeFilter === cat ? 'bg-primary border-primary' : 'bg-white/10 dark:bg-white/5 border-white/20 dark:border-white/10'}`}
                            >
                                <Text className={`font-black text-[10px] uppercase tracking-widest ${activeFilter === cat ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#8b5cf6" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredTransactions}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl 
                                refreshing={refreshing} 
                                onRefresh={onRefresh} 
                                tintColor="#8b5cf6"
                            />
                        }
                        ListEmptyComponent={
                            <View className="flex-1 items-center justify-center py-20">
                                <View className="bg-slate-200 dark:bg-white/5 p-8 rounded-[40px] mb-6">
                                    <ShoppingBag size={48} color={isDark ? "#334155" : "#cbd5e1"} />
                                </View>
                                <Text className="text-slate-500 dark:text-slate-400 font-black text-lg text-center tracking-tight">Sin movimientos</Text>
                                <Text className="text-slate-400 dark:text-slate-500 text-sm text-center mt-2 px-10 leading-5"> Tus compras y canjes aparecerán aquí al instante. </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
