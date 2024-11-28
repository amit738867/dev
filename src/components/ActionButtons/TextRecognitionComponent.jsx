import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  TouchableWithoutFeedback,
  LogBox,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import LottieView from 'lottie-react-native';
import { useNavigation, StackActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { activateKeepAwakeAsync} from 'expo-keep-awake';
import { GOOGLE_VISION_API_KEY } from '@env';

LogBox.ignoreAllLogs();


const TextRecognitionComponent = () => {
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const [file, setFile] = useState('');
  const [image, seImage] = useState('');
  const [loading, setLoading] = useState(null);
  const [fileUri, setFileUri] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [folderUri, setFolderUri] = useState(null);
  const [mediaUri, setMediaUri] = useState(null);

  useEffect(() => {
    const loadDefaultFolder = async () => {
      const storedUri = await AsyncStorage.getItem('defaultFolderUri');
      setFolderUri(storedUri || `${FileSystem.documentDirectory}OmniCapture/`);
    };
    loadDefaultFolder();
  }, []);
  const handleViewImage = (fileUri) => {
    setSelectedFile({ uri: fileUri, type: 'image' });
    navigation.navigate('Result', { 
      audioUri: file,
      summaryUr: image, 
      mode: selectedMode || { language: 'English' } ,
      regenerate:true
    });
  };

  
  const ensureFolderExists = async () => {
    if (!folderUri) return;
    const folderInfo = await FileSystem.getInfoAsync(folderUri);
    if (!folderInfo.exists) {
      await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
    }
  };

  useEffect(() => {
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (fileUri) {
        saveToFile(text); 
      }
    });

    return () => {
      keyboardDidHideListener.remove();
    };
  }, [text, fileUri]);


  
  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setLoading(true); 
      const { uri } = result.assets[0];
      const extension = uri.split('.').pop(); 
      await storeMedia(uri, extension); 

    }
  };

  const storeMedia = async (uri, extension) => {
    try {
      await ensureFolderExists();

      if (!folderUri) {
        return;
      }
      const currentDate = new Date();
      const id = Math.random().toString(36).substring(2, 15);
      const formattedDate = `${currentDate.getDate()}-${currentDate.getMonth() + 1}-${currentDate.getFullYear()}`;
      const formattedTime = `${currentDate.getHours()}-${currentDate.getMinutes()}-${currentDate.getSeconds()}`;
      const fileName = `${id}_${formattedDate}_${formattedTime}_.${extension}`;
      const fileUri = `${folderUri}${fileName}`;

      await FileSystem.copyAsync({ from: uri, to: fileUri });
      setMediaUri(fileUri); 
      await activateKeepAwakeAsync();
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
    } catch (error) {
      setLoading(false); 
      console.error('Error storing media:', error);
    }
  };

  const saveToFile = async (content) => {
    try {
      if (fileUri) {
        await FileSystem.writeAsStringAsync(fileUri, content);
      }
    } catch (error) {
      console.error('Error saving the file:', error);
    }
  };

  const GoToHome = async () => {
    if (fileUri) {
      await saveToFile(text); // Sauvegarde avant de retourner à l'accueil
    }
    navigation.dispatch(StackActions.replace('Accueil'));
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.container}>
          {loading ? (
            <LottieView
              source={require('../../../assets/Anim.json')}
              autoPlay
              loop
              resizeMode="cover"
              style={styles.lottieFullScreen}
            />
          ) : (
            <>
              {/* Affiche toujours l'icône d'accueil */}
              <TouchableOpacity onPress={GoToHome} style={styles.homeButton}>
                <Ionicons name="home-outline" size={32} color="#fff" />
              </TouchableOpacity>

              <View style={styles.centerContainer}>
                {!text && (
                  <TouchableOpacity style={styles.coco}>
                    <Text style={styles.title}>Scan Text</Text>

                    <TouchableOpacity style={styles.button} onPress={openCamera}>
                      <Text style={styles.buttonText}>Pick an Image</Text>
                      <Ionicons name="image-outline" style={styles.icon} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  coco:{
    top:'290%',
    left:'20%',
    width:'60%'
  },
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  lottieFullScreen: {
    width: '100%',
    height: '100%',
  },
  scrollContainer: {
    paddingTop:120,
    padding: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  resultSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 20,
    width: '96%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#03dac6',
    marginBottom: 10,
  },
  textInput: {
    fontSize: 16,
    color: '#fff',
    padding: 10,
    borderRadius: 5,
    height: 'auto',
    textAlignVertical: 'top',
  },
  resultText: {
    fontSize: 16,
    color: '#fff',
  },
  homeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'black',
    padding: 10,
    borderRadius: 20,
    zIndex: 3,
  },
  title: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 30,
    textAlign: 'center',
  },
  button: {
    backgroundColor: 'black',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    marginRight: 10,
  },
  icon: {
    color: '#fff',
    fontSize: 20,
  },
});

export default TextRecognitionComponent;
