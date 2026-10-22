import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useProducer } from '@/lib/producer-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
const HOLD_MS = 1100;

export default function SplashIndex() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { status, loading: producerLoading } = useProducer();
  const leaving = useRef(false);

  useEffect(() => {
    if (loading || producerLoading || leaving.current) return;
    const timer = setTimeout(() => {
      leaving.current = true;
      if (!user) {
        router.replace('/login');
        return;
      }
      router.replace(status === 'producer' ? '/home' : '/acesso');
    }, HOLD_MS);
    return () => clearTimeout(timer);
  }, [loading, producerLoading, router, status, user]);

  function reveal() {
    requestAnimationFrame(() => {
      void SplashScreen.hideAsync();
    });
  }

  return (
    <View style={styles.splash}>
      <Image
        source={require('../assets/images/splash-pdv.jpg')}
        style={styles.art}
        resizeMode="cover"
        fadeDuration={0}
        onLoadEnd={reveal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: '#01020B',
  },
  art: {
    width: screenWidth,
    height: screenHeight,
  },
});
