import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from './app/index';
import * as SplashScreen from 'expo-splash-screen';
import LottieView from 'lottie-react-native';
import { LogBox } from 'react-native';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';

enableScreens();

LogBox.ignoreAllLogs(true);

export default function App() {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  useEffect(() => {
    const prepareApp = async () => {
      await SplashScreen.preventAutoHideAsync();
      SplashScreen.hideAsync();

      // Créer un dossier spécifique à l'application dans le gestionnaire de fichiers
      const folderUri = `${FileSystem.documentDirectory}OmniCapture`; // Nom du dossier
      const folderInfo = await FileSystem.getInfoAsync(folderUri);

      if (!folderInfo.exists) {
        try {
          await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
          console.log("Dossier 'OmniCapture' créé avec succès.");
        } catch (error) {
          console.error("Erreur lors de la création du dossier :", error);
        }
      } else {
        console.log("Dossier 'OmniCapture' existe déjà.");
      }

      setTimeout(() => {
        setIsAnimationComplete(true); 
      }, 3000); 
    };

    prepareApp();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {!isAnimationComplete ? (
        <View style={styles.splashContainer}>
          <LottieView
            source={require('./assets/animation.json')} 
            autoPlay
            loop={true}  
            style={{ width: '100%', height: '100%' }} 
            resizeMode="contain"
          />
        </View>
      ) : (
        <SafeAreaProvider>
          <NavigationContainer>
            <HomeScreen />
          </NavigationContainer>
        </SafeAreaProvider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e', 
  },
});
