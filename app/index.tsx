import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator, Text, Image, TouchableOpacity } from 'react-native';
import { useColorScheme } from 'nativewind';
import * as Network from 'expo-network';
import { WifiOff } from 'lucide-react-native';

export default function Index() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [status, setStatus] = useState('Verificando conexión...');
    const [isOffline, setIsOffline] = useState(false);

    const check = async () => {
        try {
            setIsOffline(false);
            setStatus('Verificando conexión...');
            
            // 1. Validar conexión a Internet
            const networkState = await Network.getNetworkStateAsync();
            if (networkState.isConnected === false) {
                setIsOffline(true);
                return;
            }

            setStatus('Cargando...');

            const { data: { session }, error: sessionError } = await supabase.auth.getSession();

            if (sessionError) {
                await supabase.auth.signOut();
                router.replace('/welcome');
                return;
            }

            if (session) {
                try {
                    // Verificamos si el usuario ya tiene un perfil completo en el CRM
                    const { data: existingCustomer } = await supabase
                        .from('customers')
                        .select('id, name, phone')
                        .eq('email', session.user.email)
                        .maybeSingle();

                    // Si existe y tiene teléfono, ya está registrado completamente
                    if (existingCustomer && existingCustomer.phone) {
                        router.replace('/dashboard/home' as any);
                    } else {
                        // Si no existe o le falta el teléfono, lo mandamos a completar su perfil
                        router.replace('/complete-profile' as any);
                    }

                } catch (syncError) {
                    console.error('Error verificando perfil:', syncError);
                    router.replace('/complete-profile' as any);
                }
            } else {
                router.replace('/welcome');
            }
        } catch (e) {
            router.replace('/welcome');
        }
    };

    useEffect(() => {
        check();
    }, []);

    if (isOffline) {
        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#000' : '#f3f0ff', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <WifiOff size={64} color="#8b5cf6" style={{ marginBottom: 20 }} />
                <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
                    Sin Conexión
                </Text>
                <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 16, textAlign: 'center', marginBottom: 30 }}>
                    Parece que no tienes acceso a internet. Por favor, verifica tu conexión y vuelve a intentarlo.
                </Text>
                <TouchableOpacity 
                    onPress={check}
                    style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30 }}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Reintentar</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{ 
            flex: 1, 
            backgroundColor: isDark ? '#000' : '#f3f0ff', 
            justifyContent: 'center', 
            alignItems: 'center' 
        }}>
            <Image 
                source={require('../assets/quantica-logo.png')} 
                style={{ width: 120, height: 120, marginBottom: 40 }}
            />
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text className="mt-8 text-slate-500 font-bold text-sm tracking-widest uppercase">
                {status}
            </Text>
        </View>
    );
}
