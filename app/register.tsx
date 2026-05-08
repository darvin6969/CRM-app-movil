import { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
    ScrollView, Image, Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Check, AlertCircle } from 'lucide-react-native';
import { AnimatedButton } from '../components/AnimatedButton';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { TermsModal } from '../components/TermsModal';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';

try {
    WebBrowser.maybeCompleteAuthSession();
} catch (e) {
    console.warn('WebBrowser init warning:', e);
}

const GoogleLogo = () => (
    <View style={{ width: 22, height: 22, marginRight: 12, position: 'relative', transform: [{ scale: 1.1 }] }}>
        <View style={{ 
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            borderRadius: 11, 
            borderWidth: 3, 
            borderColor: '#4285F4', 
            borderTopColor: '#EA4335', 
            borderRightColor: '#FBBC05', 
            borderBottomColor: '#34A853',
            transform: [{ rotate: '-45deg' }]
        }} />
        <View style={{ 
            position: 'absolute', 
            top: 9, right: -1, 
            width: 10, height: 3, 
            backgroundColor: '#4285F4' 
        }} />
    </View>
);

export default function RegisterScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        WebBrowser.warmUpAsync().catch(() => {});
        return () => { 
            isMounted.current = false; 
            WebBrowser.coolDownAsync().catch(() => {});
        };
    }, []);
    
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

    const handleRegister = async () => {
        if (!name || !email || !password || !phone || !confirmPassword) {
            setError('Por favor, llena todos los campos');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (!acceptedTerms) {
            setError('Debes aceptar los Términos y Condiciones');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            // 1. Sign up user via Supabase Auth
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: name }
                }
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Este correo ya tiene cuenta. Por favor, inicia sesión.');
                    return;
                }
                throw signUpError;
            }

            // 2. Insert into customers table (CRM data)
            const { error: dbError } = await supabase.from('customers').insert([{
                email,
                name,
                phone,
                status: 'Activo',
                tier: 'Bronze',
                loyalty_points: 0,
                join_date: new Date().toISOString()
            }]);

            if (dbError) {
                console.error('DB Insert Error:', dbError);
            }
            
            router.replace('/');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado');
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        if (!acceptedTerms) {
            setError('Debes aceptar los Términos y Condiciones para continuar');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const redirectUrl = Linking.createURL('oauth-callback');
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                    skipBrowserRedirect: true,
                }
            });
            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
                
                if (result.type === 'success' && result.url) {
                    const hash = result.url.split('#')[1] || result.url.split('?')[1];
                    if (!hash) throw new Error('No se recibió el token.');
                    
                    const params: Record<string, string> = {};
                    hash.split('&').forEach(part => {
                        const chunks = part.split('=');
                        if (chunks.length === 2) params[chunks[0]] = chunks[1];
                    });

                    if (params.error) {
                        throw new Error(params.error_description || 'Error de autenticación desde Google.');
                    }

                    if (params.access_token && params.refresh_token) {
                        const { error: sessionError } = await supabase.auth.setSession({
                            access_token: params.access_token,
                            refresh_token: params.refresh_token,
                        });
                        if (sessionError) throw sessionError;
                        // La redirección la maneja automáticamente _layout.tsx al detectar SIGNED_IN
                    } else {
                        throw new Error('No se encontraron tokens válidos.');
                    }
                } else if (result.type === 'success') {
                    // Esperar a que el router intercepte el link
                } else {
                    setIsLoading(false);
                }
            }
        } catch (err: any) {
            console.error('Google Register Error:', err);
            setError(err.message || 'Error al registrar con Google.');
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };


    return (
        <View className="flex-1">
            <LinearGradient
                colors={(isDark ? ['#3b0764', '#000000'] : ['#c4b5fd', '#ffffff']) as any}
                className="absolute inset-0"
            />
            
            <SafeAreaView className="flex-1">
                <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                    <BlurView 
                        intensity={isDark ? 30 : 60} 
                        tint={isDark ? "dark" : "light"} 
                        className="rounded-[32px] p-6 overflow-hidden border border-white/20 dark:border-white/10 shadow-xl"
                    >
                        {error ? (
                            <Animated.View 
                                style={{ 
                                    position: 'absolute', 
                                    top: 12, left: 16, right: 16, zIndex: 100,
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
                                    
                                    {/* Timer Progress Bar */}
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
                        <View className="flex-row items-center mb-8">
                            <TouchableOpacity onPress={() => router.back()} className="mr-4 bg-white/20 dark:bg-black/20 p-3 rounded-2xl">
                                <ChevronLeft color={isDark ? "white" : "black"} size={24} />
                            </TouchableOpacity>
                            <View>
                                <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Crear Cuenta</Text>
                                <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">Portal Quantica</Text>
                            </View>
                        </View>


                        <View className="gap-y-4">
                            <View>
                                <TextInput
                                    className="w-full bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-base font-medium"
                                    placeholder="Nombre Completo"
                                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                    autoCapitalize="words"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View className="mt-4">
                                <TextInput
                                    className="w-full bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-base font-medium"
                                    placeholder="Teléfono"
                                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                    keyboardType="phone-pad"
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </View>

                            <View className="mt-4">
                                <TextInput
                                    className="w-full bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-base font-medium"
                                    placeholder="Correo Electrónico"
                                    placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>

                             <View className="mt-4">
                                 <TextInput
                                     className="w-full bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-base font-medium"
                                     placeholder="Contraseña"
                                     placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                     secureTextEntry
                                     value={password}
                                     onChangeText={setPassword}
                                 />
                             </View>

                             <View className="mt-4">
                                 <TextInput
                                     className="w-full bg-white/50 dark:bg-black/40 border border-white/40 dark:border-white/10 rounded-2xl px-5 py-4 text-slate-900 dark:text-white text-base font-medium"
                                     placeholder="Confirmar Contraseña"
                                     placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                     secureTextEntry
                                     value={confirmPassword}
                                     onChangeText={setConfirmPassword}
                                 />
                             </View>

                                {/* Terms & Conditions Checkbox */}
                                <TouchableOpacity 
                                    onPress={() => setAcceptedTerms(!acceptedTerms)}
                                    className="flex-row items-center px-2 py-1 mt-6 mb-2"
                                    activeOpacity={0.7}
                                >
                                    <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${acceptedTerms ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/20'}`}>
                                        {acceptedTerms && <Check size={14} color="#fff" strokeWidth={4} />}
                                    </View>
                                    <View className="ml-3 flex-row flex-wrap flex-1">
                                        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold">Acepto los </Text>
                                        <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                                            <Text className="text-primary text-xs font-black">Términos y Condiciones </Text>
                                        </TouchableOpacity>
                                        <Text className="text-slate-500 dark:text-slate-400 text-xs font-bold">de Quantica.</Text>
                                    </View>
                                </TouchableOpacity>

                                <AnimatedButton
                                    className="w-full bg-slate-900 dark:bg-white h-16 rounded-2xl items-center justify-center mt-2 shadow-lg"
                                    onPress={handleRegister}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={isDark ? "#000" : "#fff"} />
                                    ) : (
                                        <Text className="text-white dark:text-slate-900 font-bold text-lg">Crear mi Cuenta</Text>
                                    )}
                                </AnimatedButton>

                            <View className="flex-row items-center my-2">
                                <View className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                                <Text className="mx-4 text-slate-400 font-bold text-xs uppercase tracking-widest">O</Text>
                                <View className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                            </View>

                            <TouchableOpacity
                                onPress={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full bg-white dark:bg-black/20 h-16 rounded-[24px] flex-row items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm"
                            >
                                <Image 
                                    source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png' }}
                                    style={{ width: 24, height: 24 }}
                                    className="mr-3"
                                />
                                 <Text className="text-slate-900 dark:text-white font-bold text-lg">Regístrate con Google</Text>
                             </TouchableOpacity>

                             <View className="mt-8 flex-row justify-center items-center gap-x-2">
                                 <Text className="text-slate-500 dark:text-slate-400 font-bold text-sm">¿Ya tienes cuenta?</Text>
                                 <AnimatedButton onPress={() => router.push('/login')} activeScale={0.9}>
                                     <Text className="text-primary font-black uppercase text-xs tracking-widest">Inicia Sesión</Text>
                                 </AnimatedButton>
                             </View>
                         </View>
                    </BlurView>
                </ScrollView>

                {/* TERMS MODAL INTEGRATION */}
                <TermsModal 
                    visible={showTermsModal} 
                    onClose={() => setShowTermsModal(false)} 
                    isDark={isDark} 
                />
            </SafeAreaView>
        </View>
    );
}
