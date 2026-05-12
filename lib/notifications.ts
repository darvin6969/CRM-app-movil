import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Configuración de cómo se muestran las notificaciones cuando la app está abierta
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // El projectId viene del app.json
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    
    token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('Push Token Generado:', token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushToken(token: string) {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) return;

        // Intentamos guardar el token en la columna expo_push_token
        // Nota: El usuario debe haber creado esta columna en su tabla 'customers'
        const { error } = await supabase
            .from('customers')
            .update({ expo_push_token: token })
            .eq('email', session.user.email);

        if (error) {
            console.error('Error al guardar el Push Token (¿Falta la columna expo_push_token?):', error);
        } else {
            console.log('Push Token guardado exitosamente en Supabase');
        }
    } catch (err) {
        console.error('Error en savePushToken:', err);
    }
}
