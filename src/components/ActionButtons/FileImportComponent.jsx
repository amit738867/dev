import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, StackActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import axios from 'axios';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { GOOGLE_VISION_API_KEY } from '@env';

const FileImportComponent = () => {
  const [folderUri, setFolderUri] = useState(null);
  const [fileUri, setFileUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const loadDefaultFolder = async () => {
      const storedUri = await AsyncStorage.getItem('defaultFolderUri');
      setFolderUri(storedUri || `${FileSystem.documentDirectory}OmniCapture/`); // Default to OmniCapture if no folder is set
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
      }
    }
  };

  const GoToHome = () => {
    navigation.dispatch(StackActions.replace('Accueil'));
  };

  const pickFile = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({
        type: '*/*', 
        copyToCacheDirectory: true,
      });
      console.log('coco cava',result);
      if (result && !result.canceled && result.assets && result.assets.length > 0) {
        setLoading(true);
        const { uri, name } = result.assets[0]; 
        const extension = uri.split('.').pop();
        console.log('extention :',extension)
        console.log('name :',name)
        await storeFile(uri, extension, name);
      }
    } catch (error) {
      console.error('Error picking file:', error);
    }
  };
  

  const storeFile = async (uri, extension, fileName) => {
    try {
      await ensureFolderExists();
      const currentDate = new Date();
      const id = Math.random().toString(36).substring(2, 15);
      const formattedDate = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
      const formattedTime = `${currentDate.getHours()}-${currentDate.getMinutes()}-${currentDate.getSeconds()}`;
      const newFileName = `${id}_${formattedDate}_${formattedTime}_${fileName}`;
      const fileUri = `${folderUri}${newFileName}`;

      await FileSystem.copyAsync({ from: uri, to: fileUri });
      setFileUri(fileUri);
      await activateKeepAwakeAsync();
      if (extension === 'txt') {
        const textContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
        navigation.navigate('Result', {
          audioUri: fileUri,
          mode: { "language": "English", "name": "No Mode", prompt: '', "voiceModel": "" },
          regenerate: true,
          recognizedText: textContent || null,
        });
      }else{

        const base64Image = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
        const response = await axios.post(
          `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
          {
            requests: [
              {
                image: { content: base64Image },
                features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
              },
            ],
          }
        );
        const recognizedText = response.data.responses[0].fullTextAnnotation.text;
        const storageKey = `${fileName}_recognizedText`;
        console.log('storageeee is :',storageKey)
      await AsyncStorage.setItem(storageKey, recognizedText);
  
  
    navigation.navigate('Result', { 
      audioUri: uri,
      mode:  {"language": "English", "name": "No Mode", prompt: '', "voiceModel": ""} ,
      regenerate:true,
      recognizedText: recognizedText || null
  
    });
      }
    } catch (error) {
      setLoading(false);
      console.error('Error storing file:', error);
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
            <Ionicons name="home-outline" size={28} color="#fff" />
          </TouchableOpacity>         
          <Text style={styles.title}>File Import</Text>
          <TouchableOpacity style={styles.button} onPress={pickFile}>
            <Text style={styles.buttonText}>Pick a File</Text>
            <FontAwesome name="file" style={styles.icon} />
          </TouchableOpacity>         
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

export default FileImportComponent;
