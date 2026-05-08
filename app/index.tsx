import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator, Text, Image } from 'react-native';
import { useColorScheme } from 'nativewind';

export default function Index() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const [status, setStatus] = useState('Cargando...');

    useEffect(() => {
        const check = async () => {
            try {
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

                        setTimeout(() => {
                            // Si existe y tiene teléfono, ya está registrado completamente
                            if (existingCustomer && existingCustomer.phone) {
                                router.replace('/dashboard/home' as any);
                            } else {
                                // Si no existe o le falta el teléfono, lo mandamos a completar su perfil
                                router.replace('/complete-profile' as any);
                            }
                        }, 800);

                    } catch (syncError) {
                        console.error('Error verificando perfil:', syncError);
                        setTimeout(() => {
                            router.replace('/complete-profile' as any);
                        }, 800);
                    }
                } else {
                    router.replace('/welcome');
                }
            } catch (e) {
                router.replace('/welcome');
            }
        };
        check();
    }, []);

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
