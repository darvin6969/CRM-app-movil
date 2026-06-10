import 'react-native-url-polyfill/auto';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'nativewind';
import { useEffect, useRef, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { supabase } from '../lib/supabase';
import * as Linking from 'expo-linking';
import { registerForPushNotificationsAsync, savePushToken, scheduleInactivityReminder } from '../lib/notifications';
import '../global.css';

export default function Layout() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const isMounted = useRef(false);
    const { colorScheme } = useColorScheme();

    useEffect(() => {
        isMounted.current = true;
        
        const handleDeepLink = async (event: { url: string }) => {
            const url = event.url;
            if (!url) return;
            
            const accessTokenMatch = url.match(/access_token=([^&]+)/);
            const refreshTokenMatch = url.match(/refresh_token=([^&]+)/);
            
            if (accessTokenMatch && refreshTokenMatch) {
                const access_token = accessTokenMatch[1];
                const refresh_token = refreshTokenMatch[1];
                
                const { error } = await supabase.auth.setSession({
                    access_token,
                    refresh_token
                });
                
                if (!error && url.includes('type=recovery')) {
                    router.replace('/reset-password' as any);
                }
            }
        };

        Linking.getInitialURL().then(url => {
            if (url) handleDeepLink({ url });
        });

        const linkingSub = Linking.addEventListener('url', handleDeepLink);

        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('LAYOUT - Auth Event:', event);
            
            if (!isMounted.current) return;

            if (event === 'PASSWORD_RECOVERY') {
                console.log('Detectado evento de recuperación, redirigiendo...');
                setTimeout(() => {
                    if (isMounted.current) router.replace('/reset-password');
                }, 500);
                return;
            }

            if (event === 'SIGNED_OUT') {
                setTimeout(() => {
                    if (isMounted.current) router.replace('/welcome' as any);
                }, 200);
            }
            if (event === 'SIGNED_IN' && session) {
                setTimeout(() => {
                    if (isMounted.current) router.replace('/');
                }, 200);
            }
        });

        return () => {
            isMounted.current = false;
            authSub.unsubscribe();
            linkingSub.remove();
        };
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
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="welcome" />
                <Stack.Screen name="oauth-callback" />
                <Stack.Screen name="dashboard" options={{ headerShown: false }} />
                <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="complete-profile" options={{ animation: 'fade' }} />
                <Stack.Screen name="points-history" options={{ animation: 'slide_from_bottom' }} />
                <Stack.Screen name="personal-data" options={{ animation: 'slide_from_right' }} />
                <Stack.Screen name="reset-password" options={{ animation: 'fade' }} />
                <Stack.Screen name="+not-found" />
            </Stack>
        </ThemeProvider>
    );
}
