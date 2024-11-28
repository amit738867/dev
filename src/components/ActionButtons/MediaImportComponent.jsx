import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useNavigation, StackActions } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native'; 
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import { GOOGLE_VISION_API_KEY } from '@env';
import { activateKeepAwakeAsync } from 'expo-keep-awake';


const MediaImportComponent = () => {
  const [folderUri, setFolderUri] = useState(null);
  const [mediaUri, setMediaUri] = useState(null);
  const [loading, setLoading] = useState(false); 
  const navigation = useNavigation();
  const [image, seImage] = useState('');
  
  useEffect(() => {
    const loadDefaultFolder = async () => {
      const storedUri = await AsyncStorage.getItem('defaultFolderUri');
      setFolderUri(storedUri || `${FileSystem.documentDirectory}OmniCapture/`); // Default to OmniCapture if not set
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

  
  const GoToHome = async () => {
    navigation.dispatch(StackActions.replace('Accueil'));
  };

 
  const pickMedia = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false, 
      quality: 0.9, 
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
          
          <Text style={styles.title}>Media Import</Text>

          <TouchableOpacity style={styles.button} onPress={pickMedia}>
            <Text style={styles.buttonText}>Pick Media (Image/Video)</Text>
            <FontAwesome name="photo" style={styles.icon} />
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

export default MediaImportComponent;
