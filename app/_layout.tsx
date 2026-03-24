import 'react-native-url-polyfill/auto';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import '../global.css';

export default function Layout() {
    const router = useRouter();
    const segments = useSegments();
    useEffect(() => {
        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('LAYOUT - Auth Event:', event);
            
            if (event === 'SIGNED_OUT') {
                router.replace('/welcome' as any);
            }
        });

        return () => authSub.unsubscribe();
    }, []);

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="personal-data" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="complete-profile" options={{ animation: 'fade' }} />
            <Stack.Screen name="+not-found" />
        </Stack>
    );
}
