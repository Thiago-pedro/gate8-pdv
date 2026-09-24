import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScreenShell } from '@/components/AuthScreenShell';
import { Logo } from '@/components/Logo';
import { NeonCard } from '@/components/NeonCard';
import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useProducer } from '@/lib/producer-context';

export default function AcessoScreen() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { status, loading: producerLoading } = useProducer();

  useEffect(() => {
    if (loading || producerLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (status === 'producer') router.replace('/home');
  }, [loading, producerLoading, router, status, user]);

  async function leave() {
    await signOut();
    router.replace('/login');
  }

  return (
    <AuthScreenShell>
      <View style={styles.logoWrap}>
        <Logo height={48} centered />
        <Text style={styles.brand}>PDV</Text>
      </View>
      <NeonCard>
        <Ionicons name="lock-closed-outline" size={28} color={colors.blue} style={styles.icon} />
        <Text style={styles.title}>Acesso só para produtores</Text>
        <Text style={styles.lead}>
          O Terminal PDV usa a mesma conta do painel do produtor. Entre com um login que já tenha perfil de produtor.
        </Text>
        <Pressable onPress={() => void leave()} style={styles.leaveWrap}>
          <LinearGradient colors={['#007BFF', '#0056b3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.leave}>
            <Text style={styles.leaveText}>Sair</Text>
          </LinearGradient>
        </Pressable>
      </NeonCard>
    </AuthScreenShell>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brand: {
    color: colors.blue,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 10,
    fontSize: 13,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  lead: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  leaveWrap: {
    alignSelf: 'stretch',
  },
  leave: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveText: {
    color: colors.loginText,
    fontWeight: '700',
    fontSize: 16,
  },
});
