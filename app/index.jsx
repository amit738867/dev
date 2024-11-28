import React, { useEffect, useState ,useCallback} from 'react';
import { View ,ActivityIndicator } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { FIREBASE_AUTH } from '../firebaseConfig';
import Login from '../src/components/Login/Login';
import HomePage from '../src/components/HomePage/HomePage';
import SettingsPage from '../src/components/Setting/SettingsPage ';
import VoiceMemoPage from '../src/components/ActionButtons/VoiceMemoPage';
import NewMode from '../src/components/Setting/NewMode';
import IntegrationsPage from '../src/components/Setting/IntegrationsPage';
import ResultScreen from '../src/components/ActionButtons/ResultScreen';
import TextRecognitionComponent from '../src/components/ActionButtons/TextRecognitionComponent';
import MediaImportComponent from '../src/components/ActionButtons/MediaImportComponent';
import CameraCaptureComponent from '../src/components/ActionButtons/CameraCaptureComponent';
import VideoCaptureComponent from '../src/components/ActionButtons/VideoCaptureComponent';
import UrlImportComponent from '../src/components/ActionButtons/UrlImportComponent';
import FileImportComponent from '../src/components/ActionButtons/FileImportComponent';
import TextWriteComponent from '../src/components/ActionButtons/TextWriteComponent';

const Stack = createNativeStackNavigator();

const InsideLayout = () => {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Accueil" component={HomePage} />
        <Stack.Screen name="VoiceMemoPage" component={VoiceMemoPage} />
        <Stack.Screen name="SettingsPage" component={SettingsPage} />
        <Stack.Screen name="NewMode" component={NewMode} />
        <Stack.Screen name="IntegrationsPage" component={IntegrationsPage} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="TextRecognitionComponent" component={TextRecognitionComponent} />
        <Stack.Screen name="MediaImportComponent" component={MediaImportComponent} />
        <Stack.Screen name="CameraCaptureComponent" component={CameraCaptureComponent} />
        <Stack.Screen name="VideoCaptureComponent" component={VideoCaptureComponent} />
        <Stack.Screen name="UrlImportComponent" component={UrlImportComponent} />
        <Stack.Screen name="FileImportComponent" component={FileImportComponent} />
        <Stack.Screen name="TextWriteComponent" component={TextWriteComponent} />
        <Stack.Screen name="Login" component={Login} />
      </Stack.Navigator>
    </View>
  );
};


export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        const googleUser = await AsyncStorage.getItem('user');
        setUser(googleUser ? googleUser : null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName="Login">
      {user ? (
        <Stack.Screen
          name="Inside"
          component={InsideLayout}
          options={{ headerShown: false }}
        />
      ) : (
        <>
        
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Accueil" component={HomePage} options={{ headerShown: false }} />
        
        </>
      )}
    </Stack.Navigator>
  );
}