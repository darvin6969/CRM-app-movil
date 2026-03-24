import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Phone, ChevronLeft, UserCircle2, Check, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { AnimatedButton } from '../components/AnimatedButton';
import { TermsModal } from '../components/TermsModal';
import { useRef } from 'react';
import * as Haptics from 'expo-haptics';

export default function CompleteProfileScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(true);
    const isMounted = useRef(true);

    // Elite Toast States
    const errorOpacity = useRef(new Animated.Value(0)).current;
    const errorTranslateY = useRef(new Animated.Value(-20)).current;
    const errorTimerWidth = useRef(new Animated.Value(100)).current;

    // Auto-dismiss error after 3 seconds with animation
    useEffect(() => {
        if (error) {
            // Haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

            // Entry Animation
            Animated.parallel([
                Animated.timing(errorOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(errorTranslateY, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
                Animated.timing(errorTimerWidth, { toValue: 0, duration: 3000, useNativeDriver: false })
            ]).start();

            const timer = setTimeout(() => {
                // Exit Animation
                Animated.timing(errorOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
                    setError('');
                    errorTimerWidth.setValue(100);
                    errorTranslateY.setValue(-20);
                });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        isMounted.current = true;
        checkExistingData();
        return () => { isMounted.current = false; };
    }, []);

    const checkExistingData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Pre-fill name from Google if available
                const fullName = user.user_metadata?.full_name || '';
                if (fullName) setName(fullName);

                // Check if they already have a record (safety check)
                const { data: customer } = await supabase
                    .from('customers')
                    .select('name, phone')
                    .eq('email', user.email)
                    .maybeSingle();
                
                if (customer && isMounted.current) {
                    if (customer.name && customer.phone) {
                        router.replace('/dashboard/home');
                        return;
                    }
                    if (customer.name) setName(customer.name);
                    if (customer.phone) setPhone(customer.phone);
                }
            }
        } catch (err) {
            console.error('Error checking profile:', err);
        } finally {
            if (isMounted.current) setIsChecking(false);
        }
    };

    const handleBack = async () => {
        try {
            await supabase.auth.signOut();
            router.replace('/welcome');
        } catch (err) {
            console.error('Error signing out during back:', err);
            router.replace('/welcome');
        }
    };

    const handleComplete = async () => {
        if (!name || !phone) {
            setError('Por favor completa todos los campos');
            return;
        }

        if (phone.length !== 9) {
            setError('El teléfono debe tener 9 dígitos');
            return;
        }

        if (!acceptedTerms) {
            setError('Debes aceptar los Términos y Condiciones');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No se encontró sesión activa');

            // UPSERT into customers
            const { error: dbError } = await supabase.from('customers').upsert({
                email: user.email,
                name: name,
                phone: phone,
                status: 'Activo',
                tier: 'Bronze',
                loyalty_points: 0,
                join_date: new Date().toISOString()
            }, { onConflict: 'email' });

            if (dbError) throw dbError;

            router.replace('/dashboard/home');
        } catch (err: any) {
            setError(err.message || 'Error al guardar el perfil');
        } finally {
            setIsLoading(false);
        }
    };

    if (isChecking) {
        return (
            <View className="flex-1 bg-slate-50 dark:bg-black items-center justify-center">
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            className="flex-1"
        >
            <View className="flex-1">
                <LinearGradient
                    colors={isDark ? ['#3b0764', '#000000'] : ['#c4b5fd', '#ffffff']}
                    className="absolute inset-0"
                />

                <SafeAreaView className="flex-1 px-6">
                    {/* Back Button */}
                    <TouchableOpacity 
                        onPress={handleBack}
                        className="mt-4 mb-4 w-12 h-12 bg-white/40 dark:bg-white/10 rounded-2xl items-center justify-center border border-white/20 dark:border-white/10"
                    >
                        <ChevronLeft size={24} color={isDark ? "#ffffff" : "#000000"} />
                    </TouchableOpacity>

                    <View className="flex-1 justify-center pb-20">
                    <BlurView 
                        intensity={isDark ? 30 : 60} 
                        tint={isDark ? "dark" : "light"}
                        className="rounded-[40px] p-8 border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden"
                    >
                        <View className="items-center mb-8">
                            <View className="bg-primary/20 p-4 rounded-full mb-4">
                                <UserCircle2 size={42} color="#8b5cf6" />
                            </View>
                            <Text className="text-3xl font-black text-slate-900 dark:text-white text-center tracking-tight">Casi listo</Text>
                            <Text className="text-slate-500 dark:text-slate-400 text-center mt-3 font-medium px-4 leading-6">Únete a la élite de Quantica. Completa tus datos para activar tus beneficios exclusivos.</Text>
                        </View>

                        {error ? (
                            <Animated.View 
                                style={{ 
                                    position: 'absolute', 
                                    top: 12, left: 16, right: 16, zIndex: 1000,
                                    opacity: errorOpacity,
                                    transform: [{ translateY: errorTranslateY }]
                                }}
                            >
                                <BlurView 
                                    intensity={100} 
                                    tint={isDark ? "dark" : "light"}
                                    className="rounded-3xl border border-white/40 dark:border-white/10 overflow-hidden shadow-2xl"
                                >
                                    <LinearGradient
                                        colors={['rgba(239, 68, 68, 0.2)', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        className="flex-row items-center p-5 pl-4"
                                    >
                                        <View className="bg-red-500 p-2 rounded-2xl mr-4 shadow-lg shadow-red-500/50">
                                            <AlertCircle size={18} color="#fff" strokeWidth={3} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-red-500 dark:text-red-400 font-black text-[10px] uppercase tracking-widest mb-0.5">Atención</Text>
                                            <Text className="text-slate-900 dark:text-white font-bold text-sm leading-tight">
                                                {error}
                                            </Text>
                                        </View>
                                    </LinearGradient>
                                    
                                    <Animated.View 
                                        style={{ 
                                            height: 3, 
                                            backgroundColor: '#ef4444',
                                            width: errorTimerWidth.interpolate({
                                                inputRange: [0, 100],
                                                outputRange: ['0%', '100%']
                                            })
                                        }}
                                    />
                                </BlurView>
                            </Animated.View>
                        ) : null}

                        <View className="gap-y-4">
                            <View className="flex-row items-center bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 h-16">
                                <User size={18} color={isDark ? "#ffffff" : "#000000"} />
                                <TextInput
                                    className="flex-1 text-slate-900 dark:text-white text-base font-bold ml-3"
                                    placeholder="Nombre y Apellido"
                                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                    autoCapitalize="words"
                                    value={name}
                                    onChangeText={setName}
                                />
                                {name.length > 3 && (
                                    <Check size={16} color="#10b981" />
                                )}
                            </View>

                            <View className="flex-row items-center bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 h-16">
                                <Phone size={18} color={isDark ? "#ffffff" : "#000000"} />
                                <TextInput
                                    className="flex-1 text-slate-900 dark:text-white text-base font-bold ml-3"
                                    placeholder="Teléfono"
                                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                    keyboardType="phone-pad"
                                    maxLength={9}
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                                {phone.length === 9 && (
                                    <Check size={16} color="#10b981" />
                                )}
                            </View>

                            <TouchableOpacity 
                                onPress={() => setAcceptedTerms(!acceptedTerms)}
                                className="flex-row items-center px-2 py-1 mt-4"
                                activeOpacity={0.7}
                            >
                                <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${acceptedTerms ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/20'}`}>
                                    {acceptedTerms && <Check size={14} color="#fff" strokeWidth={4} />}
                                </View>
                                <View className="ml-3 flex-row flex-wrap flex-1">
                                    <Text className="text-slate-600 dark:text-zinc-400 text-xs font-bold leading-5">Acepto los </Text>
                                    <TouchableOpacity 
                                        onPress={() => setShowTermsModal(true)}
                                        activeOpacity={0.6}
                                    >
                                        <Text className="text-primary font-black text-xs leading-5 underline decoration-primary/30">Términos y Condiciones</Text>
                                    </TouchableOpacity>
                                    <Text className="text-slate-600 dark:text-zinc-400 text-xs font-bold leading-5"> de Quantica.</Text>
                                </View>
                            </TouchableOpacity>

                            <AnimatedButton
                                className={`w-full ${isLoading ? 'bg-slate-800' : 'bg-slate-900 dark:bg-white'} h-16 rounded-[24px] items-center justify-center mt-8 shadow-xl`}
                                onPress={handleComplete}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={isDark ? "#000" : "#fff"} />
                                ) : (
                                    <Text className="text-white dark:text-slate-900 font-black text-lg uppercase tracking-widest">Finalizar Registro</Text>
                                )}
                            </AnimatedButton>
                        </View>
                    </BlurView>

                    {/* TERMS MODAL INTEGRATION */}
                    <TermsModal 
                        visible={showTermsModal} 
                        onClose={() => setShowTermsModal(false)} 
                        isDark={isDark} 
                    />
                    </View>
                </SafeAreaView>
            </View>
        </KeyboardAvoidingView>
    );
}
