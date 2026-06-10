import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
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

    try {
        // El projectId viene del app.json
        const projectId = 'e1cc5fda-1fcd-4628-a2e3-383069f0f126';
        
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('Push Token Generado:', token);
    } catch (e: any) {
        console.log('Push Token Error (Silent):', e.message || String(e));
    }
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


export async function scheduleInactivityReminder() {
  try {
    // Primero cancelamos todas las notificaciones programadas previas
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Programar una nueva notificación
    // Para pruebas iniciales: 60 segundos
    const triggerInSeconds = 60;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "¡Te extrañamos en Quantica! 🎀",
        body: "No olvides que tienes puntos acumulados listos para canjear por premios.",
        sound: true,
      },
      trigger: {
        seconds: triggerInSeconds,
        repeats: false, // Sólo una vez, si entra de nuevo se reprogramará
      },
    });
    
    console.log('Notificación de inactividad programada en ' + triggerInSeconds + ' segundos');
  } catch (err) {
    console.error('Error programando la notificación de inactividad:', err);
  }
}
