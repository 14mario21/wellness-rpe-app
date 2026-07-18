import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import SetupScreen from './src/screens/SetupScreen';
import PlayerHome from './src/screens/PlayerHome';
import FormScreen from './src/screens/FormScreen';
import CoachPanel from './src/screens/CoachPanel';
import {
  registerForPushNotificationsAsync,
  addNotificationTapListener,
  getInitialNotificationType,
} from './src/notifications';
import { registerPlayer } from './src/api';

const STORAGE_KEY = 'user.v1';

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null); // { role, name }
  const [screen, setScreen] = useState('home'); // 'home' | 'form' | 'coach'
  const [formType, setFormType] = useState('wellness');
  const [pushEnabled, setPushEnabled] = useState(false);
  const tapUnsub = useRef(null);

  // Cargar usuario guardado al arrancar.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          setUser(saved);
          if (saved.role === 'coach') setScreen('coach');
        }
      } catch (e) {
        // ignorar
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  // Cuando hay un jugador, configurar push y escuchar toques de notificación.
  useEffect(() => {
    if (!user || user.role !== 'player') return;

    (async () => {
      const token = await registerForPushNotificationsAsync();
      setPushEnabled(!!token);
      if (token) {
        try {
          await registerPlayer(user.name, token);
        } catch (e) {
          // El servidor podría estar apagado; la app sigue funcionando.
          console.warn('No se pudo registrar en el servidor:', e.message);
        }
      }

      // ¿Se abrió la app desde una notificación?
      const initial = await getInitialNotificationType();
      if (initial) openForm(initial);
    })();

    // Toque sobre una notificación mientras la app está abierta/en segundo plano.
    tapUnsub.current = addNotificationTapListener((type) => openForm(type));
    return () => {
      if (tapUnsub.current) tapUnsub.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSetupDone(u) {
    setUser(u);
    setScreen(u.role === 'coach' ? 'coach' : 'home');
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }

  async function logout() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setScreen('home');
  }

  function openForm(type) {
    setFormType(type === 'rpe' ? 'rpe' : 'wellness');
    setScreen('form');
  }

  if (booting) {
    return (
      <View style={styles.boot}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <StatusBar style="light" />
        <SetupScreen onDone={handleSetupDone} />
      </>
    );
  }

  if (user.role === 'coach') {
    return (
      <>
        <StatusBar style="light" />
        <CoachPanel onLogout={logout} />
      </>
    );
  }

  // Jugador
  return (
    <>
      <StatusBar style="light" />
      {screen === 'form' ? (
        <FormScreen type={formType} onBack={() => setScreen('home')} />
      ) : (
        <PlayerHome
          name={user.name}
          pushEnabled={pushEnabled}
          onOpenForm={openForm}
          onLogout={logout}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
