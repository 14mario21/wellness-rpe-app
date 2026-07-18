// Registro y manejo de notificaciones push con Expo.
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Cómo se muestran las notificaciones cuando la app está en primer plano.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Pide permiso y devuelve el Expo Push Token (o null si no se puede).
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Avisos de entrenamiento',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22c55e',
    });
  }

  if (!Device.isDevice) {
    // Los emuladores no reciben push remoto; solo dispositivos reales.
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  // Sin projectId (p. ej. vista previa en Expo Go) no se pueden obtener tokens
  // de push remoto. Devolvemos null en vez de lanzar un error.
  if (!projectId) {
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.warn('No se pudo obtener el push token:', e.message);
    return null;
  }
}

// Escucha el toque sobre una notificación y ejecuta callback(type).
// type viene del campo data.type que envía el servidor ('wellness' | 'rpe').
export function addNotificationTapListener(callback) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const type = response?.notification?.request?.content?.data?.type;
    if (type) callback(type);
  });
  return () => sub.remove();
}

// Si la app se abrió DESDE una notificación (estaba cerrada), devuelve su type.
export async function getInitialNotificationType() {
  const response = await Notifications.getLastNotificationResponseAsync();
  return response?.notification?.request?.content?.data?.type ?? null;
}
