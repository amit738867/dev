import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert, PermissionsAndroid ,FlatList ,Modal ,Platform} from 'react-native';
import AudioRecord from 'react-native-audio-record';
import axios from 'axios';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, StackActions } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from "@react-native-async-storage/async-storage";
import LottieView from 'lottie-react-native';
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from 'expo-keep-awake';

export default function VoiceMemoPage({route}) {

  const navigation = useNavigation();
  const mode = route?.params?.mode;
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUri, setAudioUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modes, setModes] = useState([]);  
  const [selectedMode, setSelectedMode] = useState(mode || {"language": "English", "name": "No Mode", "prompt": "", "voiceModel": ""});  
  const [showModePicker, setShowModePicker] = useState(false);  
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  const [aud, setAud] = useState('');
  const [audioUrii, setAudioUrii] = useState(route?.params?.audioUrii || null);

  
  useEffect(() => {
    const loadModes = async () => {
      try {
        const storedModes = await AsyncStorage.getItem('modes');
        if (storedModes) {
          setModes(JSON.parse(storedModes));
        }
      } catch (error) {
        console.error('Failed to load modes from storage:', error);
      }
    };
    loadModes();
  }, []);

  useEffect(() => {
    AudioRecord.init({
      sampleRate: 44100,  
      channels: 1,
      bitsPerSample: 16,  
      audioSource: 6,    
      wavFile: 'test.wav',
    });
  }, []);
  

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  const GoToHome = () => {
    navigation.dispatch(StackActions.replace('Accueil')); 
  };
  const generateId = () => {
    return `a${Math.floor(Math.random() * 10000)}`;
  };

  const generateFilename = (modeName, extension) => {
    const id = generateId();
    const currentDate = new Date();
  
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); 
    const day = String(currentDate.getDate()).padStart(2, '0');
  
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
  
    const date = `${day}-${month}-${year}`;
    const time = `${hours}-${minutes}-${seconds}`;
  
    return `${id}_${date}_${time}_${modeName}.${extension}`;
  };

  const requestMicrophonePermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'This app needs access to your microphone for recording.',
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Microphone permission error:', error);
      return false;
    }
  };

  const startRecording = async () => {
    
    try {
      await activateKeepAwakeAsync();
            if(Platform.OS == 'ios'){
        const permission = await Audio.requestPermissionsAsync();
        if (permission.status === 'granted') {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });
    
          const { recording } = await Audio.Recording.createAsync(
            Audio.RECORDING_OPTIONS_PRESET_LOW_QUALITY
          );
          setRecording(recording);
          setIsRecording(true); 
          setIsPaused(false);
          setRecordingDuration(0);
    
          const interval = setInterval(() => {
            setRecordingDuration((prevDuration) => prevDuration + 1000);
          }, 1000);
          setTimerInterval(interval);
        } else {
          Alert.alert('Permission denied', 'Microphone permission is required to record audio.');
        }
      }else{

        const hasPermission = await requestMicrophonePermission();
        if (!hasPermission) {
          Alert.alert('Permission Denied', 'Cannot start recording without microphone access.');
          return;
        }
        setIsRecording(true);
        setIsPaused(false);
        setRecordingDuration(0);
  
        const interval = setInterval(() => {
          setRecordingDuration((prevDuration) => prevDuration + 1000);
        }, 1000);
        setTimerInterval(interval);
        AudioRecord.start();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if(Platform.OS === 'ios'){
        setIsRecording(false);
        setIsPaused(false);
        clearInterval(timerInterval);
        setTimerInterval(null);
      
        if (!recording) {
          return;
        }

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
    
        if (!uri) {
          Alert.alert('Erreur', 'Impossible de récupérer l\'URI du fichier audio.');
          return;
        }
    
        const extension = uri.split('.').pop();
        const fileName = generateFilename(selectedMode ? selectedMode.name : mode.name, extension);
        const folderUri = await AsyncStorage.getItem('defaultFolderUri') || `${FileSystem.documentDirectory}OmniCapture/`;
        const folderInfo = await FileSystem.getInfoAsync(folderUri);
        if (!folderInfo.exists) {
          await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
        }
    
        const newFileUri = `${folderUri}${fileName}`;
        console.log('new file uri is', newFileUri);
    
        await FileSystem.moveAsync({
          from: uri,
          to: newFileUri,
        });
    
        setAudioUri(newFileUri);
        transcribeAudio(newFileUri);
      }else{
        const audioFilePath = await AudioRecord.stop();
        const extension = audioFilePath.split('.').pop();
        setIsRecording(false);
        if (!audioFilePath) {
          Alert.alert('Error', 'Unable to retrieve the audio file.');
          return;
        }
        let uri = 'file://' +audioFilePath;
        const folderUri = await AsyncStorage.getItem('defaultFolderUri') || `${FileSystem.documentDirectory}OmniCapture/`;   
        const folderInfo = await FileSystem.getInfoAsync(folderUri);
        if (!folderInfo.exists) {
          await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
        }
        const fileName = generateFilename(selectedMode ? selectedMode.name : mode.name, extension);
        const newFileUri = audioUrii || `${folderUri}${fileName}`;  
        await FileSystem.moveAsync({
          from: uri,
          to: newFileUri,
        });
        setAudioUri(newFileUri);
        transcribeAudio(newFileUri);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      setIsRecording(false);
    }
  };
  const pauseRecording = async () => {
    try {
      if (recording && !isPaused) { 
        await recording.pauseAsync(); 
        setIsPaused(true); 
        if (timerInterval) { 
          clearInterval(timerInterval);
          setTimerInterval(null);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la pause de l\'enregistrement :', error);
    }
  };
  
  const resumeRecording = async () => {
    try {
      if (recording && isPaused) { 
        await recording.startAsync(); 
        setIsPaused(false); 
  
        const interval = setInterval(() => {
          setRecordingDuration((prevDuration) => prevDuration + 1000);
        }, 1000);
        setTimerInterval(interval);
      }
    } catch (error) {
      console.error('Erreur lors de la reprise de l\'enregistrement :', error);
    }
  };
  
  

  const handleCloseRecording = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync(); 
        setRecording(null);
        setIsRecording(false);
        setIsPaused(false);
        navigation.dispatch(StackActions.replace('Accueil')); 

      }
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'enregistrement :', error);
    }
  };


  const transcribeAudio = async (uri) => {
    setLoading(true);
    try {
      const fileExtension = uri.split('.').pop().toLowerCase();
      let fileType;
      if (fileExtension === 'm4a') {
        fileType = 'audio/m4a';
      } else if (fileExtension === 'wav') {
        fileType = 'audio/wav'; 
      } else {
        fileType = 'audio/mpeg'; 
      }
      const formData = new FormData();
      formData.append('file', { uri:  uri, name: `audio.${fileExtension}`, type: fileType });
      formData.append('model', 'whisper-1');
      const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
      });
       navigation.navigate('Result', { transcription: response.data.text, audioUri: uri, mode: mode || { language: 'English' }, regenerate:true });

    } catch (error) {
      console.error('Transcription error:', error.message);
      Alert.alert('Transcription Error', 'An error occurred during transcription. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    setShowModePicker(false);
  };
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.folderIcon} onPress={GoToHome}>
        <Icon name="home" size={32} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingsIcon} onPress={() => navigation.navigate('SettingsPage')}>
        <Icon name="settings-outline" size={32} color="white" />
      </TouchableOpacity>
      {isRecording &&!isPaused && (
        <LottieView
          source={require('../../../assets/audio-spectrum.json')} 
          autoPlay
          loop
          style={styles.spectre}
        />
      )}
     <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Icon 
            name={isRecording ? "square" : "radio-button-on"}  
            size={70} 
            color="red" 
          />
        </TouchableOpacity>

        {isRecording && (
          <>
             <TouchableOpacity style={styles.controlButton} onPress={handleCloseRecording}>
          <Icon name="close" size={40} color="white" />
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.controlButton} 
            onPress={isPaused ? resumeRecording : pauseRecording}
          >
            <Icon name={isPaused ? "play" : "pause"} size={40} color="white" />
          </TouchableOpacity>
          </>
        )}
      </View>

      {isRecording && (
        <Text style={styles.timer}>{formatDuration(recordingDuration)}</Text>
      )}
        {!isRecording && (
      <View style={styles.modeContainer}>
        <TouchableOpacity onPress={() => setShowModePicker(true)} style={styles.modeButton}>
          <Text style={styles.modeText}>{selectedMode ? selectedMode.name : 'Select mode'}</Text>
          <Icon name="chevron-down-outline" size={24} color="white" style={styles.modeIcon} />
        </TouchableOpacity>
      </View>
    )}

      <Modal
        transparent={true}
        animationType="fade"
        visible={showModePicker}
        onRequestClose={() => setShowModePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <FlatList
              data={modes}
              keyExtractor={(item) => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modeOption}
                  onPress={() => handleModeSelect(item)}
                >
                  <Text style={styles.modeOptionText}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModePicker(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        transparent={true}
        animationType="fade"
        visible={loading}
        onRequestClose={() => setLoading(false)}
      >
        <View style={styles.modalContainer}>
          <LottieView
            source={require('../../../assets/loading-animation.json')}
            autoPlay
            loop
            style={styles.lottie}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: '#2a2a2a', 
    borderRadius: 10, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, 
    shadowRadius: 6,
    elevation: 5, 
  },
  modeOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#333', 
    borderRadius: 8, 
    marginBottom: 10,
    width: '100%',
    alignItems: 'center',
  },
  modeOptionText: {
    fontSize: 16,
    color: '#f0f0f0',
    fontWeight: '500', 
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 25,
    backgroundColor: 'red', 
    borderRadius: 8, 
  },
  closeButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600', 
  },
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
  },
  folderIcon: {
    position: 'absolute',
    top: 50,
    left: 20,
  },
  settingsIcon: {
    position: 'absolute',
    top: 50,
    right: 20, 
  },
  spectre: {
    width: '100%',
    height: 150,
    alignSelf: 'center',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 50,
    width: '100%',
  },
  controlButton: {
    marginHorizontal: 20,
  },
  modeContainer: {
    position: 'absolute',
    bottom: 50,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modeText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '500',
    marginRight: 4, 
  },
  modeIcon: {
    marginLeft: 4, 
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  lottie: {
    width: 200,
    height: 200,
  },
  timer: {
    color: 'white',
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
});

