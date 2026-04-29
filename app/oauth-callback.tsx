import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function OAuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const forceLogin = async () => {
            console.log('Callback activado, forzando entrada...');
            try {
                // Pequeña espera para que Supabase registre el token en el almacenamiento
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                const { data: { session } } = await supabase.auth.getSession();
                
                if (session) {
                    console.log('Sesión encontrada, saltando al Dashboard');
                    router.replace('/dashboard/home');
                } else {
                    console.log('No se encontró sesión tras el callback, volviendo a login');
                    router.replace('/login');
                }
            } catch (err) {
                console.error('Error en forceLogin:', err);
                router.replace('/login');
            }
        };

        forceLogin();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={{ color: '#fff', marginTop: 20 }}>Sincronizando con Google...</Text>
        </View>
    );
}
