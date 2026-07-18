import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getSchedule, saveSchedule, sendNow, getPlayers } from '../api';

// Días de la semana. Índice = valor de Date.getDay() (0=Domingo).
const DAYS = [
  { v: 1, label: 'L' },
  { v: 2, label: 'M' },
  { v: 3, label: 'X' },
  { v: 4, label: 'J' },
  { v: 5, label: 'V' },
  { v: 6, label: 'S' },
  { v: 0, label: 'D' },
];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export default function CoachPanel({ onLogout }) {
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState([]);
  const [wellnessTime, setWellnessTime] = useState('17:30');
  const [rpeTime, setRpeTime] = useState('19:30');
  const [enabled, setEnabled] = useState(true);
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [s, p] = await Promise.all([getSchedule(), getPlayers().catch(() => [])]);
      if (s) {
        setDays(s.days || []);
        setWellnessTime(s.wellnessTime || '17:30');
        setRpeTime(s.rpeTime || '19:30');
        setEnabled(s.enabled !== false);
      }
      setPlayers(Array.isArray(p) ? p : p.players || []);
    } catch (e) {
      Alert.alert('Sin conexión con el servidor', String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(v) {
    setDays((prev) => (prev.includes(v) ? prev.filter((d) => d !== v) : [...prev, v]));
  }

  async function onSave() {
    if (!TIME_RE.test(wellnessTime) || !TIME_RE.test(rpeTime)) {
      Alert.alert('Hora no válida', 'Usa el formato HH:MM, por ejemplo 17:30.');
      return;
    }
    try {
      await saveSchedule({ days, wellnessTime, rpeTime, enabled });
      Alert.alert('Guardado', 'El horario se ha guardado correctamente.');
    } catch (e) {
      Alert.alert('Error al guardar', String(e.message || e));
    }
  }

  async function manualSend(type) {
    try {
      const r = await sendNow(type);
      Alert.alert(
        'Aviso enviado',
        `Notificación de ${type === 'rpe' ? 'RPE' : 'Wellness'} enviada a ${
          r.sent ?? '?'
        } jugador(es).`
      );
    } catch (e) {
      Alert.alert('Error al enviar', String(e.message || e));
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Panel del entrenador</Text>
      <Text style={styles.subtitle}>{players.length} jugador(es) registrados</Text>

      {/* Envío manual */}
      <Text style={styles.section}>Enviar aviso ahora</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: '#2563eb' }]}
          onPress={() => manualSend('wellness')}
        >
          <Text style={styles.sendText}>Wellness</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: '#dc2626' }]}
          onPress={() => manualSend('rpe')}
        >
          <Text style={styles.sendText}>RPE</Text>
        </TouchableOpacity>
      </View>

      {/* Horario automático */}
      <Text style={styles.section}>Horario automático</Text>

      <Text style={styles.label}>Días de entrenamiento</Text>
      <View style={styles.daysRow}>
        {DAYS.map((d) => {
          const on = days.includes(d.v);
          return (
            <TouchableOpacity
              key={d.v}
              style={[styles.day, on && styles.dayOn]}
              onPress={() => toggleDay(d.v)}
            >
              <Text style={[styles.dayText, on && styles.dayTextOn]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Hora del Wellness (antes de entrenar)</Text>
      <TextInput
        style={styles.input}
        value={wellnessTime}
        onChangeText={setWellnessTime}
        placeholder="17:30"
        placeholderTextColor="#94a3b8"
        keyboardType="numbers-and-punctuation"
      />

      <Text style={styles.label}>Hora del RPE (después de entrenar)</Text>
      <TextInput
        style={styles.input}
        value={rpeTime}
        onChangeText={setRpeTime}
        placeholder="19:30"
        placeholderTextColor="#94a3b8"
        keyboardType="numbers-and-punctuation"
      />

      <TouchableOpacity
        style={[styles.toggle, enabled ? styles.toggleOn : styles.toggleOff]}
        onPress={() => setEnabled((v) => !v)}
      >
        <Text style={styles.toggleText}>
          {enabled ? '✅ Automático activado' : '⏸️ Automático pausado'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.save} onPress={onSave}>
        <Text style={styles.saveText}>Guardar horario</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onLogout}>
        <Text style={styles.logout}>Salir del panel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingTop: 64, gap: 12 },
  title: { color: '#f8fafc', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 14, marginBottom: 8 },
  section: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginTop: 16 },
  label: { color: '#e2e8f0', fontSize: 14, marginTop: 8 },
  row: { flexDirection: 'row', gap: 12 },
  sendBtn: { flex: 1, borderRadius: 12, paddingVertical: 18, alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayOn: { backgroundColor: '#22c55e' },
  dayText: { color: '#94a3b8', fontWeight: '700' },
  dayTextOn: { color: '#052e16' },
  input: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  toggle: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 12 },
  toggleOn: { backgroundColor: '#14532d' },
  toggleOff: { backgroundColor: '#78350f' },
  toggleText: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  save: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveText: { color: '#052e16', fontSize: 16, fontWeight: '700' },
  logout: { color: '#94a3b8', textAlign: 'center', marginTop: 20, fontSize: 14 },
});
