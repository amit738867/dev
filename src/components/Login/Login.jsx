import React, { useState } from "react";
import { useNavigation, StackActions } from '@react-navigation/native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode
} from '@react-native-google-signin/google-signin';
import { StyleSheet, Text, TextInput, TouchableOpacity,View, Alert, ActivityIndicator,} from "react-native";
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { FIREBASE_AUTH } from "../../../firebaseConfig";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword ,signOut } from "firebase/auth";
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@env';
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  scopes: ['https://www.googleapis.com/auth/drive.file'], 
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});
export default function Login() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordIsVisible, setPasswordIsVisible] = useState(false); // For toggling password visibility
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoginForm, setIsLoginForm] = useState(true); 
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const refreshPage = () => setRefreshKey(prevKey => prevKey + 1);

  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const token = (await GoogleSignin.getTokens()).accessToken;
      await AsyncStorage.setItem('token', token);
      const email = response.data.user.email;
      const user = response.data.user;
      await AsyncStorage.setItem('email', email);
      await AsyncStorage.setItem('user', JSON.stringify(user));
      if (response){
        navigation.dispatch(StackActions.replace('Accueil')); 
        refreshPage();
      }
} catch (error) {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.IN_PROGRESS:
        console.log(error.message)
        break;
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        console.log(error.message)
        break;
      default:
         console.log(error.message)
    }
  } else {
    navigation.dispatch(StackActions.replace('Accueil')); 
  }
}  };

  const signIn = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
      const user = response.user;
      await AsyncStorage.setItem('email', email);
      await AsyncStorage.setItem('user',JSON.stringify(user));
      navigation.dispatch(StackActions.replace('Accueil')); 

    } catch (error) {
      alert('Email or password is not correct.');
    } finally {
      setLoading(false);
    }
  };
  const signUp = async () => {
    try {
      setLoading(true);
      const response = await createUserWithEmailAndPassword(FIREBASE_AUTH, email, password);
      Alert.alert(
        'Account Created',
        'Registration successful. Please log in.',
        [
          { text: 'OK', onPress: () => console.log('OK Pressed') }
        ],
        { cancelable: false }
      );
      await signOut(FIREBASE_AUTH);
      setIsLoginForm(true);
    } catch (error) {
      alert('Error creating account.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <View style={styles.container}>
       {!modalVisible && (
        <Text style={styles.title}>OmniCapture</Text>
      )}

      {!modalVisible && ( 
        <>
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={() => setModalVisible(true)}
            accessible
            accessibilityLabel="Open login or registration"
          >
            <Text style={styles.loginButtonText}>Login / Register</Text>
          </TouchableOpacity>
          <View style={styles.socialContainer}>
            <TouchableOpacity onPress={handleGoogleSignIn} accessible accessibilityLabel="Google Sign-In">
              <FontAwesome name="google" style={styles.icon} />
            </TouchableOpacity>
            <FontAwesome name="apple" style={styles.icon} accessible accessibilityLabel="Apple Sign-In" />
            <FontAwesome name="facebook" style={styles.icon} accessible accessibilityLabel="Facebook Sign-In" />
          </View>
        </>
      )}

      {modalVisible && (
        <>
          <View style={styles.backdrop} /> 
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isLoginForm ? 'Login' : 'Register'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#aaa"
              value={email}
              onChangeText={setEmail}
              accessible
              accessibilityLabel="Email input"
            />
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#aaa"
                secureTextEntry={!passwordIsVisible} 
                value={password}
                onChangeText={setPassword}
                accessible
                accessibilityLabel="Password input"
              />
              <TouchableOpacity style={styles.eyeIcon} onPress={() => setPasswordIsVisible(!passwordIsVisible)}>
                <Feather 
                  name={passwordIsVisible ? "eye-off" : "eye"} 
                  size={24} 
                  color="gray" 
                />
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color="#007aff" style={styles.loadingIndicator} /> 
            ) : (
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={isLoginForm ? signIn : signUp}
              >
                <Text style={styles.modalButtonText}>
                  {isLoginForm ? 'Login' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.switchButton} onPress={() => setIsLoginForm(!isLoginForm)}>
              <Text style={styles.switchButtonText}>
                {isLoginForm ? "Don't have an account? Sign up" : 'Already have an account? Login'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}






const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  title: {
    fontSize: 36,
    color: 'white',
    fontWeight: '600',
    marginBottom: 50,
  },
  loginButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 30,
    width: '80%',
    alignItems: 'center',
    marginBottom: 80,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)', 
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '60%',
  },
  icon: {
    fontSize: 40,
    color: '#B0B0B0',
  },
  modalContent: {
    backgroundColor: '#2c2c2e',
    width: '90%',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    color: 'white',
    fontWeight: '600',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#3a3a3c',
    borderRadius: 10,
    paddingHorizontal: 15,
    color: 'white',
    marginBottom: 20,
    fontSize: 16,
  },
  modalButton: {
    backgroundColor: '#007aff',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 15,
    padding: 10,
  },
  switchButtonText: {
    color: '#007aff',
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#ff3b30',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingIndicator: {
    marginVertical: 20, 
  },
  lottie: {
    width: 100,
    height: 100,
  },
  inputContainer: {
    flexDirection: 'row',
  },

  eyeIcon: {
    position: 'absolute',
    right: 10, 
    top: 15,   
  },
  
});
