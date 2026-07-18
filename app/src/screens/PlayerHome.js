import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

// Pantalla principal del jugador: accesos a los dos formularios.
export default function PlayerHome({ name, pushEnabled, onOpenForm, onLogout }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hello}>Hola, {name}</Text>
      <Text style={styles.subtitle}>
        Rellena el cuestionario que toque. También te avisaremos con una notificación
        antes y después de cada entrenamiento.
      </Text>

      <View style={[styles.badge, pushEnabled ? styles.badgeOk : styles.badgeWarn]}>
        <Text style={styles.badgeText}>
          {pushEnabled
            ? '🔔 Notificaciones activadas'
            : '⚠️ Notificaciones desactivadas (actívalas en Ajustes)'}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.card, styles.cardWellness]}
        onPress={() => onOpenForm('wellness')}
      >
        <Text style={styles.cardTitle}>Wellness</Text>
        <Text style={styles.cardDesc}>Antes del entrenamiento · fatiga, sueño, estrés…</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.card, styles.cardRpe]} onPress={() => onOpenForm('rpe')}>
        <Text style={styles.cardTitle}>RPE</Text>
        <Text style={styles.cardDesc}>Después del entrenamiento · esfuerzo percibido</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onLogout}>
        <Text style={styles.logout}>Cambiar de usuario</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 24, paddingTop: 64, gap: 16 },
  hello: { color: '#f8fafc', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#94a3b8', fontSize: 15, lineHeight: 21 },
  badge: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14 },
  badgeOk: { backgroundColor: '#14532d' },
  badgeWarn: { backgroundColor: '#78350f' },
  badgeText: { color: '#f8fafc', fontSize: 13 },
  card: { borderRadius: 16, padding: 22, marginTop: 4 },
  cardWellness: { backgroundColor: '#2563eb' },
  cardRpe: { backgroundColor: '#dc2626' },
  cardTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  cardDesc: { color: '#e2e8f0', fontSize: 14, marginTop: 6 },
  logout: { color: '#94a3b8', textAlign: 'center', marginTop: 24, fontSize: 14 },
});
