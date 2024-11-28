import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, StackActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

const UrlImportComponent = () => {
  const [folderUri, setFolderUri] = useState(null); 
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false); 
  const [fileUri, setFileUri] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    const loadDefaultFolder = async () => {
      const storedUri = await AsyncStorage.getItem('defaultFolderUri');
      setFolderUri(storedUri || `${FileSystem.documentDirectory}OmniCapture/`); 
    };
    loadDefaultFolder();
  }, []);

  const ensureFolderExists = async () => {
    if (!folderUri) return;
    const folderInfo = await FileSystem.getInfoAsync(folderUri);
    if (!folderInfo.exists) {
      try {
        await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
      } catch (error) {
        console.error('Error creating folder:', error);
        Alert.alert('Error', 'Unable to create the folder.');
      }
    }
  };

  const GoToHome = () => {
    navigation.dispatch(StackActions.replace('Accueil')); 
  };

  const importUrl = async () => {
    if (!url || !url.startsWith('http')) {
      Alert.alert('Error', 'Please enter a valid URL.');
      return;
    }

    setLoading(true); 

    try {
      await ensureFolderExists();
      const currentDate = new Date();
      const id = Math.random().toString(36).substring(2, 15);
      const formattedDate = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
      const formattedTime = `${currentDate.getHours()}-${currentDate.getMinutes()}-${currentDate.getSeconds()}`;
      const fileName = `${id}_${formattedDate}_${formattedTime}.txt`;
      const fileUri = `${folderUri}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, url);
      setFileUri(fileUri);
      
      setTimeout(() => {
        setLoading(false); 
        GoToHome();
      }, 2000); 

    } catch (error) {
      setLoading(false);
      console.error('Error storing URL:', error);
      Alert.alert('Error', 'Unable to store the URL.');
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <LottieView
          source={require('../../../assets/Anim.json')}
          autoPlay
          loop
          resizeMode="cover"
          style={styles.lottie}
        />
      ) : (
        <>
          <TouchableOpacity onPress={GoToHome} style={styles.homeButton}>
            <Ionicons name="home-outline" size={32} color="#fff" />
          </TouchableOpacity>
          
          <Text style={styles.title}>URL Import</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter URL"
            placeholderTextColor="#ccc"
            onChangeText={setUrl}
            value={url}
          />

          <TouchableOpacity style={styles.button} onPress={importUrl}>
            <Text style={styles.buttonText}>Import URL</Text>
            <FontAwesome name="link" style={styles.icon} />
          </TouchableOpacity>

          {fileUri && (
            <Text style={styles.successText}>URL stored at: {fileUri}</Text>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  lottie: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  homeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 20,
    zIndex: 2,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
    zIndex: 1,
  },
  input: {
    backgroundColor: '#333',
    padding: 10,
    width: '80%',
    borderRadius: 5,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'black',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
    zIndex: 1,
  },
  icon: {
    color: '#fff',
    fontSize: 20,
    zIndex: 1,
  },
  successText: {
    marginTop: 20,
    color: '#03dac6',
    fontSize: 16,
    textAlign: 'center',
    zIndex: 1,
  },
});

export default UrlImportComponent;
