import { DarkTheme, ThemeProvider, type ErrorBoundaryProps, Stack } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground, appBackground } from '@/components/AppBackground';
import { colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth-context';
import { ProducerProvider } from '@/lib/producer-context';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>Erro ao abrir o Terminal PDV</Text>
      <Text style={styles.errorText}>{error.message}</Text>
      <Pressable onPress={retry} style={styles.retry}>
        <Text style={styles.retryText}>Tentar de novo</Text>
      </Pressable>
    </View>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
    primary: colors.blue,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  const insets = useSafeAreaInsets();

  return (
    <ThemeProvider value={navTheme}>
      <AuthProvider>
        <ProducerProvider>
          <StatusBar style="light" />
          {Platform.OS === 'android' ? <NavigationBar style="light" /> : null}
          <AppBackground source={appBackground}>
          <Stack
            initialRouteName="index"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          >
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="login" options={{ animation: 'fade', animationDuration: 550 }} />
            <Stack.Screen name="cadastro" options={{ animation: 'fade', animationDuration: 550 }} />
            <Stack.Screen name="acesso" options={{ animation: 'fade', animationDuration: 550 }} />
            <Stack.Screen name="home" options={{ animation: 'fade', animationDuration: 550 }} />
          </Stack>
          {Platform.OS === 'android' && insets.bottom > 0 ? (
            <View pointerEvents="none" style={[styles.navScrim, { height: insets.bottom }]} />
          ) : null}
          </AppBackground>
        </ProducerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  navScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 40,
  },
  errorScreen: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: colors.blue,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: {
    color: colors.text,
    fontWeight: '700',
  },
});
