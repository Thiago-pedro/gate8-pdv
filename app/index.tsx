import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useProducer } from '@/lib/producer-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

export default function SplashIndex() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { status, loading: producerLoading } = useProducer();

  useEffect(() => {
    if (loading || producerLoading) return;
    const timer = setTimeout(() => {
      if (!user) {
        router.replace('/login');
        return;
      }
      router.replace(status === 'producer' ? '/home' : '/acesso');
    }, 1600);
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
