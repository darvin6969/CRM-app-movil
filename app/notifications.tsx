import { useState, useEffect } from 'react';
import { 
    View, Text, TouchableOpacity, ActivityIndicator, 
    FlatList, RefreshControl, Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Info, CheckCircle2, AlertTriangle, AlertCircle, X, CheckCheck } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { AnimatedButton } from '../components/AnimatedButton';

interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { data, error } = await supabase
                    .from('notifications')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                setNotifications(data || []);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const markAsRead = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
            
            if (error) throw error;
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { error } = await supabase
                    .from('notifications')
                    .update({ is_read: true })
                    .eq('user_id', session.user.id)
                    .eq('is_read', false);
                
                if (error) throw error;
                setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getIcon = (type: string, isRead: boolean) => {
        const size = 18;
        const color = isRead ? "#94a3b8" : "#8b5cf6";
        switch (type) {
            case 'success': return <CheckCircle2 size={size} color={isRead ? "#94a3b8" : "#10b981"} />;
            case 'warning': return <AlertTriangle size={size} color={isRead ? "#94a3b8" : "#f59e0b"} />;
            case 'error': return <AlertCircle size={size} color={isRead ? "#94a3b8" : "#ef4444"} />;
            default: return <Info size={size} color={color} />;
        }
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const date = new Date(item.created_at).toLocaleDateString();
        const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return (
            <AnimatedButton 
                activeScale={0.98} 
                onPress={() => !item.is_read && markAsRead(item.id)}
                className="mb-4"
            >
                <BlurView 
                    intensity={isDark ? 20 : 40}
                    tint={isDark ? "dark" : "light"}
                    className={`rounded-3xl overflow-hidden border ${item.is_read ? 'border-white/10 dark:border-white/5 opacity-70' : 'border-primary/20 bg-primary/5 shadow-lg shadow-primary/5'}`}
                >
                    <View className="p-5 flex-row items-start">
                        <View className={`p-3 rounded-2xl mr-4 ${item.is_read ? 'bg-slate-200 dark:bg-white/5' : 'bg-primary/20'}`}>
                            {getIcon(item.type, item.is_read)}
                        </View>
                        
                        <View className="flex-1">
                            <View className="flex-row justify-between items-center mb-1">
                                <Text className={`text-[10px] font-black uppercase tracking-widest ${item.is_read ? 'text-slate-400' : 'text-primary'}`}>
                                    {item.type} • {date} • {time}
                                </Text>
                                {!item.is_read && <View className="h-2 w-2 rounded-full bg-primary" />}
                            </View>
                            <Text className={`text-sm font-bold leading-5 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                {item.message}
                            </Text>
                        </View>

                        <TouchableOpacity 
                            onPress={() => deleteNotification(item.id)}
                            className="ml-2 p-2"
                        >
                            <X size={16} color={isDark ? "#4b5563" : "#94a3b8"} />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </AnimatedButton>
        );
    };

    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#1e1b4b', '#000000'] : ['#e0e7ff', '#ffffff']}
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
                            <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Notificaciones</Text>
                            <Text className="text-slate-500 dark:text-slate-400 font-medium uppercase text-[10px] tracking-widest mt-0.5">Centro de Alertas</Text>
                        </View>
                    </View>

                    {notifications.some(n => !n.is_read) && (
                        <TouchableOpacity 
                            onPress={markAllAsRead}
                            className="bg-primary/20 px-4 py-2 rounded-xl"
                        >
                            <View className="flex-row items-center">
                                <CheckCheck size={14} color="#8b5cf6" />
                                <Text className="text-primary font-black text-[10px] uppercase ml-1.5 tracking-wider">Leído</Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>

                {isLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#8b5cf6" />
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
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
                            <View className="flex-1 items-center justify-center py-40">
                                <View className="bg-slate-200 dark:bg-white/5 p-8 rounded-[40px] mb-6">
                                    <Bell size={48} color={isDark ? "#334155" : "#cbd5e1"} />
                                </View>
                                <Text className="text-slate-500 dark:text-slate-400 font-black text-lg text-center tracking-tight">Cero notificaciones</Text>
                                <Text className="text-slate-400 dark:text-slate-500 text-sm text-center mt-2 px-10 leading-5"> Te avisaremos cuando haya premios, ofertas o novedades para ti. </Text>
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
