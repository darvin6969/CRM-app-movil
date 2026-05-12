import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
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

        const { params, errorCode } = QueryParams.getQueryParams(url);

        if (errorCode) throw new Error(errorCode);

        const { access_token, refresh_token, code } = params;

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(String(code));
          if (error) throw error;
        }

        // Si llegó hasta aquí, redirigimos a la pantalla central para validar existencia
        router.replace('/');
      } catch (error) {
        console.error('Error en OAuth callback:', error);
        router.replace('/login');
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
      <ActivityIndicator size="large" color="#8b5cf6" />
      <Text style={{ color: '#fff', marginTop: 20 }}>Sincronizando con Google...</Text>
    </View>
  );
}
