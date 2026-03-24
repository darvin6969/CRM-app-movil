import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gift, Calendar, Tag, Sparkles, Rocket } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { AnimatedButton } from '../../components/AnimatedButton';

export default function PromotionsScreen() {
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    return (
        <View className="flex-1">
            <LinearGradient
                colors={isDark ? ['#3b0764', '#000000'] : ['#c4b5fd', '#ffffff']}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                <View className="px-6 py-6 pb-2">
                    <Text className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Ofertas</Text>
                    <Text className="text-slate-500 dark:text-slate-400 font-medium uppercase text-xs tracking-widest mt-1">Beneficios Quantica</Text>
                </View>

                <ScrollView 
                    contentContainerStyle={{ padding: 24 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Featured Promotion Banner */}
                    <AnimatedButton activeScale={0.97}>
                        <LinearGradient
                            colors={['#8b5cf6', '#6d28d9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="rounded-[40px] p-8 mb-10 shadow-2xl shadow-primary/40 overflow-hidden relative"
                        >
                            <View className="absolute -top-10 -right-10 opacity-20 transform rotate-12">
                                <Sparkles color="white" size={180} />
                            </View>
                            
                            <View className="flex-row items-center mb-6">
                                <View className="bg-white/20 p-2 rounded-xl mr-3 border border-white/20">
                                    <Rocket color="white" size={20} />
                                </View>
                                <Text className="text-white/80 font-black uppercase text-[10px] tracking-widest">Oferta Destacada</Text>
                            </View>
                            
                            <Text className="text-white text-3xl font-black mb-3 leading-tight tracking-tighter">
                                ¡Doble Puntaje{"\n"}este Finde!
                            </Text>
                            <Text className="text-white/80 font-medium text-sm leading-6 mb-6">
                                Acumula x2 en cada compra superior a $50. Válido sábado y domingo en todas las sucursales.
                            </Text>
                            
                            <View className="bg-white py-4 rounded-2xl items-center shadow-lg">
                                <Text className="text-primary font-black uppercase text-xs tracking-widest">Activar Ahora</Text>
                            </View>
                        </LinearGradient>
                    </AnimatedButton>

                    {/* Coupons Section */}
                    <Text className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest ml-1">Cupones</Text>
                    
                    <AnimatedButton activeScale={0.95}>
                        <BlurView 
                            intensity={isDark ? 20 : 60} 
                            tint={isDark ? "dark" : "light"}
                            className="rounded-[32px] p-6 mb-10 overflow-hidden border border-white/20 dark:border-white/10 flex-row items-center shadow-xl"
                        >
                            <View className="bg-amber-100 dark:bg-amber-900/40 p-5 rounded-[24px] mr-5 border border-amber-200/50 dark:border-amber-500/20">
                                <Tag color={isDark ? "#fbbf24" : "#d97706"} size={28} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-slate-900 dark:text-white font-black text-xl mb-1 tracking-tight">20% Accesorios</Text>
                                <View className="flex-row items-baseline">
                                    <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold mr-2">CÓDIGO:</Text>
                                    <Text className="text-primary font-black text-sm tracking-wider">QNT-ACC20</Text>
                                </View>
                            </View>
                            <TouchableOpacity className="bg-primary/10 dark:bg-primary/20 p-3 rounded-2xl">
                                <Text className="text-primary font-black text-[10px] uppercase">Copiar</Text>
                            </TouchableOpacity>
                        </BlurView>
                    </AnimatedButton>

                    {/* Upcoming Events */}
                    <Text className="text-lg font-black text-slate-900 dark:text-white mb-6 uppercase tracking-widest ml-1">Próximos Eventos</Text>
                    
                    <AnimatedButton activeScale={0.98}>
                        <BlurView 
                            intensity={isDark ? 10 : 30}
                            tint={isDark ? "dark" : "light"}
                            className="rounded-[40px] border border-white/20 dark:border-white/10 mb-10 overflow-hidden shadow-sm"
                        >
                            <View className="p-8">
                                <View className="flex-row items-center mb-6">
                                    <View className="bg-slate-100 dark:bg-slate-800 p-2 rounded-xl mr-3">
                                        <Calendar color={isDark ? "#94a3b8" : "#64748b"} size={16} />
                                    </View>
                                    <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">15 de Abril, 2026</Text>
                                </View>
                                
                                <Text className="text-slate-900 dark:text-white font-black text-2xl mb-3 tracking-tighter leading-tight">Quantica{"\n"}Tech Day</Text>
                                <Text className="text-slate-600 dark:text-slate-400 font-medium text-sm leading-6 mb-8 text-justify">
                                    Descubre el futuro de la tecnología con nuestros expertos. Sorteos, demos y puntos gratis para asistentes.
                                </Text>
                                
                                <View className="bg-slate-900 dark:bg-white py-4 rounded-2xl items-center shadow-lg">
                                    <Text className="text-white dark:text-slate-900 font-black uppercase text-xs tracking-widest">Inscribirme Gratis</Text>
                                </View>
                            </View>
                        </BlurView>
                    </AnimatedButton>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
