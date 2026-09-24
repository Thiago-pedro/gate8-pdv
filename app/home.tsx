import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Loader } from '@/components/Loader';
import { NeonCard } from '@/components/NeonCard';
import { PdvSection } from '@/components/PdvSection';
import { SiteFooter } from '@/components/SiteFooter';
import { Wordmark } from '@/components/Wordmark';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useProducer } from '@/lib/producer-context';

export default function HomeScreen() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { status, loading: producerLoading } = useProducer();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function leaveAccount() {
    setLeaveOpen(false);
    await signOut();
    router.replace('/login');
  }

  async function copyText(value: string, message: string) {
    await Clipboard.setStringAsync(value);
    if (Platform.OS === 'android') return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  useEffect(() => {
    if (loading || producerLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (status === 'guest') router.replace('/acesso');
  }, [loading, producerLoading, router, status, user]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  if (loading || producerLoading || !user || status !== 'producer') {
    return (
      <View style={styles.boot}>
        <Loader screen />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Wordmark height={28} />
        <Pressable
          onPress={() => setLeaveOpen(true)}
          hitSlop={12}
          style={styles.exitBtn}
          accessibilityRole="button"
          accessibilityLabel="Sair"
        >
          <Ionicons name="exit-outline" size={24} color="rgba(255,255,255,0.88)" />
        </Pressable>
      </View>

      <Text style={styles.hello}>Olá{user.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
      <View style={styles.leadRow}>
        <Text style={styles.lead}>Terminal PDV</Text>
        <Pressable
          onPress={() => setReloadKey((value) => value + 1)}
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
        >
          <Ionicons name="refresh" size={16} color={colors.text} />
          <Text style={styles.refreshText}>Atualizar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        <PdvSection nonce={reloadKey} onCopy={(value, message) => void copyText(value, message)} onToast={showToast} />
        <SiteFooter />
      </ScrollView>

      {toast ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      <Modal
        visible={leaveOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLeaveOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setLeaveOpen(false)} />
          <View style={styles.modalCard}>
            <NeonCard>
              <Ionicons name="exit-outline" size={28} color={colors.blue} style={styles.modalIcon} />
              <Text style={styles.modalTitle}>Sair da conta</Text>
              <Text style={styles.modalText}>Deseja sair do Terminal PDV?</Text>
              <View style={styles.modalActions}>
                <Pressable onPress={() => setLeaveOpen(false)} style={styles.modalCancel}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={() => void leaveAccount()} style={styles.modalLeaveWrap}>
                  <LinearGradient
                    colors={['#007BFF', '#0056b3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalLeave}
                  >
                    <Text style={styles.modalLeaveText}>Sair</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </NeonCard>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    height: 36,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  exitBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingLeft: 8,
  },
  hello: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 18,
  },
  lead: {
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    flex: 1,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
    gap: 10,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    height: 36,
    paddingHorizontal: 12,
  },
  refreshText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 0,
    gap: 10,
  },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 28,
    backgroundColor: '#0b1730',
    borderWidth: 1,
    borderColor: 'rgba(0,123,255,0.45)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  toastText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: 'rgba(5, 13, 31, 0.78)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
  },
  modalIcon: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  modalCancelText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  modalLeaveWrap: {
    flex: 1,
  },
  modalLeave: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalLeaveText: {
    color: colors.loginText,
    fontWeight: '700',
    fontSize: 15,
  },
});
