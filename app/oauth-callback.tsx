import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

export default function OAuthCallback() {
    const router = useRouter();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                const url = await Linking.getInitialURL();
                if (!url) {
                    router.replace('/login');
                    return;
                }

                const hash = url.split('#')[1];
                if (!hash) {
                    router.replace('/login');
                    return;
                }

                const params: Record<string, string> = {};
                hash.split('&').forEach(part => {
                    const chunks = part.split('=');
                    if (chunks.length === 2) params[chunks[0]] = chunks[1];
                });

                if (params.access_token && params.refresh_token) {
                    const { data: { session }, error } = await supabase.auth.setSession({
                        access_token: params.access_token,
                        refresh_token: params.refresh_token,
                    });

                    if (error) throw error;
                    if (session) {
                        // Success! Let the root layout handle the next step or do it here
                        // Check profile
                        const { data: customer } = await supabase
                            .from('customers')
                            .select('name, phone')
                            .eq('email', session.user.email)
                            .maybeSingle();

                        if (!customer || !customer.name || !customer.phone) {
                            router.replace('/complete-profile');
                        } else {
                            router.replace('/dashboard/home');
                        }
                    } else {
                        router.replace('/login');
                    }
                } else {
                    router.replace('/login');
                }
            } catch (err) {
                console.error('OAuth Callback Error:', err);
                router.replace('/login');
            }
        };

        handleCallback();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={{ color: '#fff', marginTop: 20, fontWeight: 'bold' }}>Finalizando inicio de sesión...</Text>
        </View>
    );
}
