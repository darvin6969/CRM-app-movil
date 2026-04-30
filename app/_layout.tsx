import 'react-native-url-polyfill/auto';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import '../global.css';

export default function Layout() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('LAYOUT - Auth Event:', event);
            
            if (event === 'SIGNED_OUT') {
                router.replace('/welcome' as any);
            }
            if (event === 'SIGNED_IN' && session) {
                console.log('Usuario autenticado, mandando a home');
                router.replace('/dashboard/home');
            }
        });

        return () => authSub.unsubscribe();
    }, []);

    if (error) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#900' }}>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: '#fff', padding: 20 }}>Error Fatal: {error}</Text>
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="oauth-callback" />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="complete-profile" options={{ animation: 'fade' }} />
            <Stack.Screen name="+not-found" />
        </Stack>
    );
}
