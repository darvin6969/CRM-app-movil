import { useState, useEffect, useRef } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, ActivityIndicator, 
    KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
    Image, Animated, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, Sun, Moon, Check, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { supabase } from '../lib/supabase';
import { AnimatedButton } from '../components/AnimatedButton';
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

export default function LoginScreen() {
    const router = useRouter();
    const { colorScheme, toggleColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Welcome Transition States
    const [welcomeName, setWelcomeName] = useState('');
    const [showWelcome, setShowWelcome] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        // Pre-calentar el navegador interno para evitar que se congele en Android
        WebBrowser.warmUpAsync().catch(() => {});
        return () => { 
            isMounted.current = false; 
            WebBrowser.coolDownAsync().catch(() => {});
        };
    }, []);

    const welcomeFade = useRef(new Animated.Value(0)).current;
    const welcomeScale = useRef(new Animated.Value(0.95)).current;

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

    const handleWelcomeTransition = () => {
        setShowWelcome(true);
        Animated.parallel([
            Animated.timing(welcomeFade, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(welcomeScale, {
                toValue: 1,
                friction: 8,
                useNativeDriver: true,
            })
        ]).start();

        setTimeout(() => {
            router.replace('/dashboard/home' as any);
        }, 2500);
    };

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Por favor completa todos los campos');
            return;
        }


        setIsLoading(true);
        setError('');

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                setIsLoading(false);
            } else {
                const { data: profile } = await supabase
                    .from('customers')
                    .select('name')
                    .eq('email', email)
                    .single();
                
                if (profile?.name) {
                    setWelcomeName(profile.name.split(' ')[0]);
                    handleWelcomeTransition();
                } else {
                    router.replace('/');
                }
            }
        } catch (err) {
            setError('Ocurrió un error inesperado');
            if (isMounted.current) setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Por favor ingresa tu correo para restablecer la contraseña');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: Linking.createURL('/login'),
            });
            if (resetError) throw resetError;
            setError('Se ha enviado un correo para restablecer tu contraseña');
        } catch (err: any) {
            setError(err.message || 'Error al enviar el correo de recuperación');
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError('');
        try {
            // Usar detección dinámica de IP para máxima estabilidad
            // IMPORTANTE: No usar slash al inicio ('oauth-callback' en vez de '/oauth-callback')
            // para evitar el bug de doble slash (//oauth-callback) que confunde a Expo Go en Android.
            const redirectUrl = Linking.createURL('oauth-callback');
            console.log('Redirecting to Google with:', redirectUrl);
            
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
                        await supabase.auth.setSession({ 
                            access_token: params.access_token, 
                            refresh_token: params.refresh_token 
                        });
                        // La redirección la maneja automáticamente _layout.tsx al detectar SIGNED_IN
                    } else {
                        throw new Error('No se encontraron tokens válidos.');
                    }
                } else if (result.type === 'success') {
                    // The browser closed and returned success, but no URL.
                    // Expo Router handles the deep link in the background.
                    // Just show loading and let it route.
                } else {
                    // User canceled or dismissed
                    setIsLoading(false);
                }
            }
        } catch (err: any) {
            console.error('Google Auth Error:', err);
            setError('Error al conectar con Google. Reintenta.');
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
            className="flex-1"
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View className="flex-1">
                    {/* Background Gradient */}
                    <LinearGradient
                        colors={isDark ? ['#3b0764', '#000000'] : ['#c4b5fd', '#ffffff']}
                        className="absolute inset-0"
                    />

                    <SafeAreaView className="flex-1 px-6">
                        {/* Theme Toggle Button */}
                        <View className="flex-row justify-end mt-4 mb-2">
                            <TouchableOpacity 
                                onPress={toggleColorScheme}
                                className="w-12 h-12 bg-white/40 dark:bg-white/10 rounded-2xl items-center justify-center border border-white/20 dark:border-white/10 shadow-sm"
                            >
                                {isDark ? (
                                    <Sun size={22} color="#ffffff" />
                                ) : (
                                    <Moon size={22} color="#0f172a" />
                                )}
                            </TouchableOpacity>
                        </View>

                        <View className="flex-1 justify-center">
                            {/* THE PREMIUM TALL CARD */}
                            <BlurView 
                                intensity={isDark ? 30 : 60} 
                                tint={isDark ? "dark" : "light"}
                                className="rounded-[48px] py-14 px-8 border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden"
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
                            <View className="items-center mb-10">
                                <Image 
                                    source={require('../assets/quantica-logo.png')} 
                                    className="h-28 w-28"
                                    style={{ resizeMode: 'contain' }}
                                />
                                <Text className="text-3xl font-black text-slate-900 dark:text-white mt-4 tracking-tighter">Quantica</Text>
                                <Text className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">Bienvenido</Text>
                            </View>


                            <View className="gap-y-5">
                                <View className="flex-row items-center bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 h-16">
                                    <Mail size={18} color={isDark ? "#ffffff" : "#000000"} />
                                    <TextInput
                                        className="flex-1 text-slate-900 dark:text-white text-base font-bold ml-3"
                                        placeholder="Correo electrónico"
                                        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>

                                <View className="flex-row items-center bg-white/40 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 h-16">
                                    <Lock size={18} color={isDark ? "#ffffff" : "#000000"} />
                                    <TextInput
                                        className="flex-1 text-slate-900 dark:text-white text-base font-bold ml-3"
                                        placeholder="Contraseña"
                                        placeholderTextColor={isDark ? "#94a3b8" : "#64748b"}
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                        {showPassword ? (
                                            <EyeOff size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                                        ) : (
                                            <Eye size={20} color={isDark ? "#94a3b8" : "#64748b"} />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View className="flex-row justify-between items-center -mt-2 mb-4">
                                    <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                                        <Text className="text-slate-500 dark:text-zinc-400 text-xs font-medium underline tracking-tight">Ver Términos y Condiciones</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
                                        <Text className="text-primary font-bold text-xs tracking-tight">¿Olvidaste tu contraseña?</Text>
                                    </TouchableOpacity>
                                </View>

                                <AnimatedButton
                                    onPress={handleLogin}
                                    disabled={isLoading}
                                    className={`w-full ${isLoading ? 'bg-slate-800' : 'bg-slate-900 dark:bg-white'} h-16 rounded-[24px] items-center justify-center mt-4 shadow-xl`}
                                >
                                    {isLoading ? (
                                        <ActivityIndicator color={isDark ? "#000" : "#fff"} />
                                    ) : (
                                        <Text className="text-white dark:text-slate-900 font-black text-lg uppercase tracking-widest">Iniciar Sesión</Text>
                                    )}
                                </AnimatedButton>

                                <View className="flex-row items-center my-2">
                                    <View className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                                    <Text className="mx-4 text-slate-400 font-bold text-xs uppercase tracking-widest">O</Text>
                                    <View className="flex-1 h-[1px] bg-slate-200 dark:bg-white/10" />
                                </View>

                                <AnimatedButton
                                    onPress={handleGoogleLogin}
                                    disabled={isLoading}
                                    className="w-full bg-white dark:bg-zinc-900 h-16 rounded-[24px] flex-row items-center justify-center border border-slate-200 dark:border-white/10 shadow-sm"
                                >
                                    <Image 
                                        source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png' }}
                                        style={{ width: 24, height: 24 }}
                                        className="mr-3"
                                    />
                                    <Text className="text-slate-900 dark:text-white font-bold text-lg">Continuar con Google</Text>
                                </AnimatedButton>

                                <View className="mt-8 flex-row justify-center items-center gap-x-2">
                                    <Text className="text-slate-500 dark:text-slate-400 font-bold text-sm">¿No tienes cuenta?</Text>
                                    <AnimatedButton onPress={() => router.push('/register' as any)} activeScale={0.9}>
                                        <Text className="text-primary font-black uppercase text-xs tracking-widest">Regístrate</Text>
                                    </AnimatedButton>
                                </View>
                            </View>
                        </BlurView>
                        </View>

                    </SafeAreaView>

                    {/* ============================================
                        WELCOME TRANSITION MODAL - PREMIUM ORIGINAL
                    ============================================ */}
                    <Modal visible={showWelcome} transparent={false} animationType="fade" statusBarTranslucent>
                        <View style={{ 
                            flex: 1, 
                            backgroundColor: isDark ? '#000000' : '#ffffff',
                            alignItems: 'center', 
                            justifyContent: 'center',
                            paddingHorizontal: 32
                        }}>
                            <Animated.View style={{ 
                                opacity: welcomeFade, 
                                transform: [{ scale: welcomeScale }],
                                alignItems: 'center',
                                width: '100%'
                            }}>
                                {/* Logo — floating, no container */}
                                <Image 
                                    source={require('../assets/quantica-logo.png')} 
                                    style={{ width: 110, height: 110, resizeMode: 'contain', marginBottom: 32 }}
                                />

                                {/* Greeting */}
                                <Text style={{ 
                                    fontSize: 13, 
                                    fontWeight: '900', 
                                    color: '#8b5cf6', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: 6,
                                    marginBottom: 12
                                }}>Bienvenido de vuelta</Text>

                                {/* Big Name */}
                                <Text style={{ 
                                    fontSize: 52, 
                                    fontWeight: '900', 
                                    color: isDark ? '#ffffff' : '#0f172a',
                                    letterSpacing: -2,
                                    textAlign: 'center',
                                    marginBottom: 8
                                }}>{welcomeName}</Text>

                                <Text style={{ 
                                    fontSize: 17, 
                                    fontWeight: '600', 
                                    color: '#94a3b8',
                                    marginBottom: 56
                                }}>Qué bueno verte por aquí</Text>

                                {/* Loading — NO container, pure floating elements */}
                                <ActivityIndicator size="small" color="#8b5cf6" style={{ marginBottom: 8 }} />
                                <Text style={{ 
                                    fontSize: 11, 
                                    fontWeight: '900', 
                                    color: '#8b5cf6', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: 2 
                                }}>Cargando tu portal</Text>
                            </Animated.View>
                        </View>
                    </Modal>

                    {/* TERMS MODAL INTEGRATION */}
                    <TermsModal 
                        visible={showTermsModal} 
                        onClose={() => setShowTermsModal(false)} 
                        isDark={isDark} 
                    />
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}
