import type { ReactNode } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

export const appBackground = require('../assets/images/app-bg.jpg') as ImageSourcePropType;
export const loginBackground = require('../assets/images/login-bg.jpg') as ImageSourcePropType;

export function AppBackground({
  source,
  children,
}: {
  source: ImageSourcePropType;
  children?: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <Image source={source} resizeMode="cover" fadeDuration={0} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#010310',
  },
});
