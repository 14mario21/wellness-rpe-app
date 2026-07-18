import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { WELLNESS_URL, RPE_URL } from '../config';

// Muestra el formulario de Google incrustado en un WebView.
// type = 'wellness' | 'rpe'
export default function FormScreen({ type, onBack }) {
  const url = type === 'rpe' ? RPE_URL : WELLNESS_URL;
  const title = type === 'rpe' ? 'RPE (post-entrenamiento)' : 'Wellness (pre-entrenamiento)';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backBtn} />
      </View>
      <WebView
        source={{ uri: url }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#22c55e" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
  },
  backBtn: { width: 90 },
  backText: { color: '#22c55e', fontSize: 16, fontWeight: '600' },
  title: { flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
