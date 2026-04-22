import { View, Text, Animated, Platform, Dimensions, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from 'nativewind';
import { AnimatedButton } from '../components/AnimatedButton';
import { LogIn, UserPlus } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// --- CONSTANTS ---
const PARTICLE_COUNT = 15;

// --- COMPONENTS ---

// V111: DATA PARTICLE SYSTEM
const ParticleLayer = () => {
    const particles = useRef([...Array(PARTICLE_COUNT)].map(() => ({
        x: new Animated.Value(Math.random() * width),
        y: new Animated.Value(Math.random() * height),
        opacity: new Animated.Value(Math.random() * 0.4),
        scale: new Animated.Value(Math.random() * 0.8 + 0.2),
    }))).current;

    useEffect(() => {
        particles.forEach(p => {
            const move = () => {
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(p.x, { toValue: Math.random() * width, duration: 10000 + Math.random() * 10000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                        Animated.timing(p.y, { toValue: Math.random() * height, duration: 10000 + Math.random() * 10000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                        Animated.timing(p.opacity, { toValue: Math.random() * 0.4, duration: 5000, useNativeDriver: true })
                    ])
                ]).start(() => move());
            };
            move();
        });
    }, []);

    return (
        <View style={{ position: 'absolute', inset: 0 }} pointerEvents="none">
            {particles.map((p, i) => (
                <Animated.View 
                    key={i}
                    style={{
                        position: 'absolute',
                        width: 4, height: 4, borderRadius: 2,
                        backgroundColor: '#818cf8',
                        opacity: p.opacity,
                        transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }]
                    }}
                />
            ))}
        </View>
    );
};

// V111: QUANTUM CORE 3-LAYER SYSTEM
const QuantumCore = ({ isDark }: { isDark: boolean }) => {
    const rotate = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const wave1 = useRef(new Animated.Value(0)).current;
    const wave2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Layer 2: Slow Rotation (30s)
        Animated.loop(Animated.timing(rotate, { toValue: 1, duration: 30000, easing: Easing.linear, useNativeDriver: true })).start();
        
        // Layer 1: Gentle Scale Pulse (Base)
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.05, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();

        // Layer 3: WiFi-style Waves
        const animateWave = (wave: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(wave, { toValue: 1, duration: 3500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(wave, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            ).start();
        };

        animateWave(wave1, 0);
        animateWave(wave2, 1750);
    }, []);

    const rotation = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    
    const renderWave = (waveAnim: Animated.Value) => (
        <Animated.View 
            style={{
                position: 'absolute',
                width: 160, height: 160, borderRadius: 80,
                borderWidth: 1.5, borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.2)',
                opacity: waveAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] }),
                transform: [{ scale: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.2] }) }]
            }}
        />
    );

    return (
        <View className="items-center justify-center" style={{ width: 280, height: 280, right: -40 }}>
            {/* Wave Expansion (Layer 3) */}
            {renderWave(wave1)}
            {renderWave(wave2)}

            {/* Solid Core (Layer 1) */}
            <Animated.View 
                style={{
                    width: 120, height: 120, borderRadius: 60,
                    backgroundColor: isDark ? '#6366f1' : '#4f46e5',
                    shadowColor: isDark ? '#818cf8' : '#6366f1',
                    shadowRadius: 50, shadowOpacity: 0.8, elevation: 25,
                    transform: [{ scale: pulse }]
                }}
            />
            
            {/* Dashed Rotating Ring (Layer 2) */}
            <Animated.View 
                style={{
                    position: 'absolute', width: 220, height: 220, borderRadius: 110,
                    borderWidth: 2, borderColor: isDark ? 'rgba(99, 102, 241, 0.4)' : 'rgba(79, 70, 229, 0.3)',
                    borderStyle: 'dashed', transform: [{ rotate: rotation }]
                }}
            />
        </View>
    );
};

export default function WelcomeScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    // ANIMATION STATES
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scanlinePos = useRef(new Animated.Value(0)).current;
    const shinePos = useRef(new Animated.Value(-1)).current;
    const statusFlicker = useRef(new Animated.Value(1)).current;

    // Staggered Entrance (V111)
    const titleFade = useRef(new Animated.Value(0)).current;
    const titleSlide = useRef(new Animated.Value(20)).current;
    const textFade = useRef(new Animated.Value(0)).current;
    const btn1Scale = useRef(new Animated.Value(0.95)).current;
    const btn1Fade = useRef(new Animated.Value(0)).current;
    const btn2Fade = useRef(new Animated.Value(0)).current;

    const [status1, setStatus1] = useState('CONNECTING...');
    const [status2, setStatus2] = useState('SYNCING...');

    useEffect(() => {
        // Entrance Sequence (Staggered)
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
            Animated.parallel([
                Animated.timing(titleFade, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(titleSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
            ]),
            Animated.delay(200),
            Animated.timing(textFade, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.delay(200),
            Animated.parallel([
                Animated.timing(btn1Fade, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.spring(btn1Scale, { toValue: 1, tension: 40, friction: 7, useNativeDriver: true }),
            ]),
            Animated.timing(btn2Fade, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]).start();

        // Status Telemetry Evolution
        setTimeout(() => setStatus1('SYSTEM_BOOT: OK'), 1800);
        setTimeout(() => setStatus2('QUANTUM_LINK: READY'), 2500);

        // Scanline Loop
        Animated.loop(Animated.timing(scanlinePos, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })).start();

        // Button Shine Loop
        Animated.loop(
            Animated.sequence([
                Animated.timing(shinePos, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.delay(1500),
                Animated.timing(shinePos, { toValue: -1, duration: 0, useNativeDriver: true }),
            ])
        ).start();

        // Status Parpadeo (Flicker)
        Animated.loop(
            Animated.sequence([
                Animated.timing(statusFlicker, { toValue: 0.7, duration: 100, useNativeDriver: true }),
                Animated.timing(statusFlicker, { toValue: 1, duration: 150, useNativeDriver: true }),
                Animated.delay(3000 + Math.random() * 2000)
            ])
        ).start();
    }, []);

    const scanlineY = scanlinePos.interpolate({ inputRange: [0, 1], outputRange: [-200, height + 200] });
    const shineX = shinePos.interpolate({ inputRange: [-1, 1], outputRange: [-width, width] });

    return (
        <View style={{ flex: 1, backgroundColor: isDark ? '#001' : '#fcfcfc' }}>
            {/* V111: DEEP VANGUARD BACKGROUND + PARTICLES */}
            <LinearGradient colors={isDark ? ['#05081c', '#000000'] : ['#f1f5f9', '#ffffff']} style={{ position: 'absolute', inset: 0 }} />
            <ParticleLayer />

            {/* V111: CINEMATIC SCANLINE */}
            <Animated.View 
                style={{
                    position: 'absolute', left: 0, right: 0, height: 160,
                    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.04)' : 'rgba(99, 102, 241, 0.02)',
                    borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.06)',
                    transform: [{ translateY: scanlineY }]
                }}
            />

            {/* V111: DYNAMIC TELEMETRY */}
            <Animated.View style={{ position: 'absolute', top: 56, left: 24, opacity: statusFlicker }}>
                <View className="p-2 border border-indigo-500/15 rounded-md backdrop-blur-sm">
                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} className="text-[9px] text-indigo-500/80 font-black uppercase tracking-[2px]">
                        {status1}
                    </Text>
                </View>
            </Animated.View>
            <Animated.View style={{ position: 'absolute', top: 56, right: 24, opacity: statusFlicker }}>
                <View className="p-2 border border-indigo-500/15 rounded-md backdrop-blur-sm">
                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} className="text-[9px] text-indigo-500/80 font-black uppercase tracking-[2px]">
                        {status2}
                    </Text>
                </View>
            </Animated.View>

            <SafeAreaView style={{ flex: 1 }}>
                <View className="flex-1 px-8 pt-12">
                    
                    {/* V111: HERO SECTION */}
                    <View className="flex-row items-center justify-between mb-8">
                        <Animated.View style={{ opacity: titleFade, transform: [{ translateY: titleSlide }] }}>
                            <Text style={{ letterSpacing: 10 }} className="text-indigo-600 dark:text-zinc-500 font-black text-[12px] uppercase mb-4">
                                Quantica
                            </Text>
                            <Text 
                                style={{ fontFamily: Platform.OS === 'ios' ? 'Times New Roman' : 'serif' }}
                                className="text-[52px] font-bold text-slate-900 dark:text-white leading-[50px] tracking-tighter italic"
                            >
                                Quantica
                            </Text>
                        </Animated.View>

                        <QuantumCore isDark={isDark} />
                    </View>

                    <Animated.View style={{ opacity: textFade }}>
                        <Text className="text-[28px] font-black text-slate-900 dark:text-white mb-2 leading-[32px] tracking-tight max-w-[90%]">
                            Gestiona tus beneficios en un solo lugar.
                        </Text>
                        <Text className="text-[14px] font-bold text-slate-500 dark:text-zinc-500 mb-12 leading-relaxed max-w-[85%]">
                            Llevamos la mejor conexión de internet hasta tu hogar con la potencia y velocidad de la fibra óptica.
                        </Text>

                        {/* V111: CONTROL PANEL */}
                        <View className="w-full gap-y-10">
                            <Animated.View style={{ opacity: btn1Fade, transform: [{ scale: btn1Scale }] }}>
                                <View className="overflow-hidden rounded-[30px] shadow-2xl shadow-indigo-500/30">
                                    <AnimatedButton activeScale={0.96} onPress={() => router.push('/login')} className="w-full h-[64px]">
                                        <LinearGradient colors={isDark ? ['#4f46e5', '#3730a3'] : ['#6366f1', '#4f46e5']} className="w-full h-full items-center justify-center flex-row">
                                            {/* Button Shine Effect */}
                                            <Animated.View 
                                                style={{
                                                    position: 'absolute', width: 120, height: '100%',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                                    transform: [{ translateX: shineX }, { skewX: '-25deg' }]
                                                }}
                                            />
                                            <LogIn size={20} color="#fff" strokeWidth={3} className="mr-3" />
                                            <Text className="text-white font-black text-lg uppercase tracking-[4px]">Entrar</Text>
                                        </LinearGradient>
                                    </AnimatedButton>
                                </View>
                                <Text className="text-center text-[10px] text-slate-400 dark:text-zinc-600 font-black uppercase mt-3 tracking-widest">
                                    ¿Ya tienes una cuenta?
                                </Text>
                            </Animated.View>

                            <Animated.View style={{ opacity: btn2Fade }}>
                                <View className="rounded-[30px] overflow-hidden border border-indigo-500/30 shadow-lg shadow-black/5 bg-white/5 backdrop-blur-md">
                                    <AnimatedButton activeScale={0.96} onPress={() => router.push('/register')} className="w-full h-[64px]">
                                        <View className="w-full h-full items-center justify-center flex-row">
                                            <UserPlus size={20} color={isDark ? "#818cf8" : "#4f46e5"} strokeWidth={3} className="mr-3" />
                                            <Text className="text-slate-900 dark:text-white font-black text-[17px] uppercase tracking-[4px]">Crear Cuenta</Text>
                                        </View>
                                    </AnimatedButton>
                                </View>
                                <Text className="text-center text-[10px] text-slate-400 dark:text-zinc-600 font-black uppercase mt-3 tracking-widest">
                                    Nuevo usuario
                                </Text>
                            </Animated.View>
                        </View>
                    </Animated.View>

                    {/* V111: ULTRA-FOOTER */}
                    <View className="absolute bottom-10 left-8 right-8 flex-row justify-between items-center opacity-40">
                        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                            QC-SYNC: ACTIVE
                        </Text>
                        <View className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                        <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }} className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                            QUANTICA_EDITION
                        </Text>
                    </View>

                </View>
            </SafeAreaView>
        </View>
    );
}
