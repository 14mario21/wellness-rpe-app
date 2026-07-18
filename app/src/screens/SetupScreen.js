import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COACH_PIN } from '../config';

// Pantalla inicial: elegir si eres Jugador o Entrenador.
export default function SetupScreen({ onDone }) {
  const [mode, setMode] = useState(null); // 'player' | 'coach'
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  function confirmPlayer() {
    const clean = name.trim();
    if (clean.length < 2) {
      Alert.alert('Nombre requerido', 'Escribe tu nombre y apellido.');
      return;
    }
    onDone({ role: 'player', name: clean });
  }

  function confirmCoach() {
    if (pin !== COACH_PIN) {
      Alert.alert('PIN incorrecto', 'El PIN del entrenador no es válido.');
      return;
    }
    onDone({ role: 'coach', name: 'Entrenador' });
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Wellness & RPE</Text>
      <Text style={styles.subtitle}>Control de carga y bienestar del equipo</Text>

      {mode === null && (
        <View style={styles.block}>
          <TouchableOpacity style={styles.primary} onPress={() => setMode('player')}>
            <Text style={styles.primaryText}>Soy jugador/a</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondary} onPress={() => setMode('coach')}>
            <Text style={styles.secondaryText}>Soy entrenador/a</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'player' && (
        <View style={styles.block}>
          <Text style={styles.label}>Tu nombre (igual que en el formulario)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre y apellido"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TouchableOpacity style={styles.primary} onPress={confirmPlayer}>
            <Text style={styles.primaryText}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)}>
            <Text style={styles.link}>Volver</Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'coach' && (
        <View style={styles.block}>
          <Text style={styles.label}>PIN del entrenador</Text>
          <TextInput
            style={styles.input}
            placeholder="PIN"
            placeholderTextColor="#94a3b8"
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
          />
          <TouchableOpacity style={styles.primary} onPress={confirmCoach}>
            <Text style={styles.primaryText}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode(null)}>
            <Text style={styles.link}>Volver</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 24,
    justifyContent: 'center',
  },
  title: { color: '#f8fafc', fontSize: 34, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#94a3b8', fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 40 },
  block: { gap: 14 },
  label: { color: '#e2e8f0', fontSize: 14, marginBottom: -4 },
  input: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  primary: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  primaryText: { color: '#052e16', fontSize: 16, fontWeight: '700' },
  secondary: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryText: { color: '#f8fafc', fontSize: 16, fontWeight: '600' },
  link: { color: '#94a3b8', textAlign: 'center', marginTop: 8, fontSize: 14 },
});
