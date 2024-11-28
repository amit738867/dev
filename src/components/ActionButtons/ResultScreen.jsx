import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert ,Image,Modal,FlatList} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { Audio, Video } from 'expo-av';
import { useNavigation, StackActions } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GOOGLE_VISION_API_KEY } from '@env';


export default function ResultScreen({ route }) {
  const navigation = useNavigation();
  
  const {recognizedText, transcription, mode, audioUri, summaryUr, transcriptionUr ,regenerate} = route.params;
  const extensionn = audioUri.split('.').pop().toLowerCase();
  const getTabLabels = (extension) => {
    switch (extension) {
      case 'm4a':
      case 'mp3':
      case 'wav':
        return { voice: 'Voice', ai: 'AI' }; // Voice and AI tabs for audio files
      case 'mp4':
      case 'avi':
      case 'mov':
        return { voice: 'Video', ai: 'Video AI' }; // Video files
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return { voice: 'Image', ai: 'Image AI' }; // Image files
      case 'txt':
      case 'pdf':
      case 'doc':
        return { voice: 'Text', ai: 'Text AI' }; // Text files
      default:
        return { voice: 'Unknown', ai: 'Unknown AI' }; // Default for unknown file types
    }
  };
  const [selectedTab, setSelectedTab] = useState('Voice');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [storedTranscription, setStoredTranscription] = useState('');
  const [fileContent, setFileContent] = useState(null);
  const [fileType, setFileType] = useState('');
  const [regenerat, setRegenerate] = useState('');
  const [recognizedTexte, setRecognizedTexte] = useState('');
  const [modes, setModes] = useState([]);  
  const [selectedMode, setSelectedMode] = useState(mode || null);  
  const [showModePicker, setShowModePicker] = useState(false); 

  useEffect(() => {
    if (regenerate) {
      setRegenerate(regenerate);
    }
  }, [regenerate]);
  useEffect(() => {
    if (recognizedText) {
      setRecognizedTexte(recognizedText);
    }
  }, [recognizedText]);
  const sound = useRef(new Audio.Sound());
  const videoRef = useRef(null);

  let summaryUri = audioUri.replace(/(\.[\w\d_-]+)$/i, '_summary.txt');
  let transcriptionUri = audioUri.replace(/(\.[\w\d_-]+)$/i, '_transcription.txt');

// Determine file type by extension
useEffect(() => {
  const fileExtension = audioUri.split('.').pop().toLowerCase();
  setFileType(fileExtension);
}, [audioUri]);

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

const displayFileContent = async () => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (fileInfo.exists) {
      const extension = audioUri.split('.').pop().toLowerCase();
      const imageTypes = ['jpg', 'jpeg', 'png'];
      
      if (extension === 'txt') {
        const textContent = await FileSystem.readAsStringAsync(audioUri);
        setFileContent(textContent);
      } else if (imageTypes.includes(extension)) {
        setFileContent(audioUri); // Set URI for image files
      } else if (extension === 'mp4' || extension === 'mov') {
        setFileContent(audioUri); // URI for video files
      } else if (extension === 'mp3' || extension === 'm4a' || extension === 'wav') {
        setFileContent(audioUri); // URI for audio files
      }
    } else {
      console.warn("File does not exist:", audioUri);
    }
  } catch (error) {
    console.error("Error loading file content:", error);
  }
};

useEffect(() => {
  displayFileContent();
}, [fileType]);

  if (summaryUr){
    summaryUri = summaryUr;
  }
  if (transcriptionUr) transcriptionUri = transcriptionUr;
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  useEffect(() => {
    console.log('selected mode is : ', selectedMode)
    if (selectedTab === 'AI') {
      fetchAndStoreSummary();
    } else {
      checkOrFetchTranscription();
    }
    return () => {
      sound.current.unloadAsync();
    };
  }, [selectedTab]);

  const fetchAndStoreSummary = async () => {
    setLoading(true);
    try {
      const fileExists = await FileSystem.getInfoAsync(summaryUri);
      if (fileExists.exists) {
        const storedSummary = await FileSystem.readAsStringAsync(summaryUri);
        setSummary(storedSummary);
      } else {
                const messages = [
          { role: 'system', content: `Tu es un assistant qui résume des textes en ${mode.language}.` },
        ];
        if (recognizedTexte) {
          console.log('anaa hna')
          messages.push({ role: 'user', content: `${mode.prompt} en ${mode.language} : ${recognizedTexte}` });
        } else if (transcription) {
          messages.push({ role: 'user', content: `${mode.prompt} en ${mode.language} : ${transcription}` });
        } else if (fileType === 'txt' && fileContent) {
          messages.push({ role: 'user', content: `${mode.prompt} en ${mode.language} : ${fileContent}` });
        }

        if (messages.length > 1) {
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-3.5-turbo',
              messages: messages,
              max_tokens: 100,
              temperature: 0.5,
            },
            {
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
            }
          );

          const generatedSummary = response.data.choices[0].message.content.trim();
          setSummary(generatedSummary);
          await FileSystem.writeAsStringAsync(summaryUri, generatedSummary);
          saveFileUris();
        } else {
          if(recognizedTexte){
            setSummary(recognizedTexte);

          } else if(summaryUr){

            setSummary(summaryUr);
          }else{
            setSummary("No textual content available .");

          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la génération du résumé :', error.message);
    
      if (['jpg', 'jpeg', 'png', 'gif'].includes(extensionn)) {
        if (recognizedTexte) {
          setSummary(recognizedTexte);
        } else {
          setSummary("The image doesn't contain recognizable text. Please try a clearer image.");
        }
      } else {
        setSummary("No textual content available.");
      }
    }
    
    setLoading(false);
  };

  const checkOrFetchTranscription = async () => {
    try {
      const fileExists = await FileSystem.getInfoAsync(transcriptionUri);
      if (fileExists.exists) {
        const storedTranscription = await FileSystem.readAsStringAsync(transcriptionUri);
        setStoredTranscription(storedTranscription);
      } else {
        if (transcription) {
          await FileSystem.writeAsStringAsync(transcriptionUri, transcription);
          setStoredTranscription(transcription);
        } 
        saveFileUris(); 
      }
    } catch (error) {
      console.error('Erreur lors du stockage de la transcription :', error.message);
    }
  };
  const saveFileUris = async () => {
    try {
      const id = audioUri.split('/').pop(); 
      const fileData = { audioUri, transcriptionUri, summaryUri };
      await AsyncStorage.setItem(`recording_${id}`, JSON.stringify(fileData));
    } catch (error) {
      console.error("Erreur lors de l'enregistrement des URI des fichiers:", error);
    }
  };
  const regerateAudio = async () => {
    setLoading(true);
    try {
    
      // Obtenir l'extension du fichier
      const fileExtension = audioUri.split('.').pop().toLowerCase();
      if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png' || fileExtension === 'gif') {
        console.log('salam')
        const base64Image = await FileSystem.readAsStringAsync(audioUri, { encoding: 'base64' });
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
        navigation.navigate('Result', { 
          audioUri: audioUri,
          summaryUr: recognizedText, 
          mode: { "language": "English", "name": "No Mode", "prompt": "", "voiceModel": "" } 
        });
      } else {
        let fileType;
        if (fileExtension === 'm4a') {
          fileType = 'audio/m4a';
        } else if (fileExtension === 'wav') {
          fileType = 'audio/wav';  // Ajout pour gérer les fichiers WAV
        } else {
          fileType = 'audio/mpeg'; // Valeur par défaut pour les fichiers mp3
        }
    
        // Construire le FormData
        const formData = new FormData();
        formData.append('file', { uri:  audioUri, name: `audio.${fileExtension}`, type: fileType });
        formData.append('model', 'whisper-1');
    
        // Effectuer la requête vers l'API de transcription
        const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'multipart/form-data',
          },
        });
    navigation.navigate('Result', { transcription: response.data.text, audioUri: audioUri, mode: mode || { language: 'English' }, regenerate:true });
        }
        } catch (error) {
      console.error('Transcription error:', error.message);
    } finally {
      setLoading(false);
    }
  }

  const playPauseAudio = async () => {
    try {
      if (isPlaying) {
        await sound.current.pauseAsync();
        setIsPlaying(false);
      } else {
        const status = await sound.current.getStatusAsync();
        if (!status.isLoaded) {
          await sound.current.loadAsync({ uri: audioUri });
        }
        await sound.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Erreur lors de la lecture/pause de l\'audio :', error);
    }
  };
  const GoToHome = () => {
    navigation.dispatch(StackActions.replace('Accueil')); 
  };
  const handleModeSelect = (mode) => {
    setSelectedMode(mode);
    setShowModePicker(false);
  };
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={GoToHome}>
          <Icon name="home" size={32} color="white" />
        </TouchableOpacity>       
      </View>
      <Text style={styles.dateText}>{formattedDate} at {formattedTime}</Text>     
      <View style={styles.tabContainer}>
        <TouchableOpacity style={styles.tab} onPress={() => setSelectedTab('Voice')}>
          <Text style={selectedTab === 'Voice' ? styles.tabTextActive : styles.tabText}>Origined Data</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab} onPress={() => setSelectedTab('AI')}>
          <Text style={selectedTab === 'AI' ? styles.tabTextActive : styles.tabText}>AI Summarised</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.transcriptionContainer}>
        {selectedTab === 'Voice' ?  loading ? (
          <ActivityIndicator size="large" color="white" />
        ) :(
           storedTranscription ? (
            <Text style={styles.transcription}>{storedTranscription}</Text>
          ) : fileType === 'txt' ? (
            <Text style={styles.transcription}>{fileContent}</Text>
          )  : fileType === 'jpg' || fileType === 'jpeg' || fileType === 'png' ? (
            <>
            {recognizedTexte && (
              <Text style={styles.transcription}>{recognizedText}</Text>
            )}
            <Image
              ref={videoRef}
              source={{ uri: fileContent }}
              style={styles.image}
              useNativeControls
              resizeMode="contain"
            />
          </>
          ) : fileType === 'mp4' || fileType === 'mov' ? (
            <Video
              ref={videoRef}
              source={{ uri: fileContent }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
            />
          ) : fileType === 'mp3' || fileType === 'm4a' ? (
            <TouchableOpacity onPress={playPauseAudio} style={styles.audioPlayer}>
              <Icon name={isPlaying ? "pause-outline" : "play-outline"} size={32} color="white" />
              <Text>{isPlaying ? "Pause Audio" : "Play Audio"}</Text>
            </TouchableOpacity>
          ) : (
            <Text>Unsupported file type.</Text>
          )
        ) : loading ? (
          <ActivityIndicator size="large" color="white" />
        ) : (
          <Text style={styles.transcription}>{summary}</Text>
        )}
      </ScrollView>
      { 

    <View style={styles.audioControls}>
 {
  regenerat && transcription ? (
    <>
      {/* Afficher les deux boutons si regenerate et transcription existent */}
      <TouchableOpacity onPress={regerateAudio} style={styles.modeButton}>
        <Text style={styles.modeText}>Regenerate</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={playPauseAudio} style={styles.playButton1}>
        <Icon name={isPlaying ? "pause-outline" : "play-outline"} size={24} color="white" />
      </TouchableOpacity>
    </>
  ) : regenerat ? (
    <TouchableOpacity onPress={regerateAudio} style={styles.modeButton}>
      <Text style={styles.modeText}>Regenerate</Text>
    </TouchableOpacity>
  ) : transcription ? (
    <TouchableOpacity onPress={playPauseAudio} style={styles.playButton}>
      <Icon name={isPlaying ? "pause-outline" : "play-outline"} size={24} color="white" />
    </TouchableOpacity>
  ) : null 
}

          
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
      
    </View>
  
}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingHorizontal: 10,
    paddingVertical: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingBottom:20
  },
  timeText: {
    color: 'white',
    fontSize: 18,
  },
  headerIcons: {
    flexDirection: 'row',
    width: 60,
    justifyContent: 'space-between',
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  dateText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tab: {
    padding: 10,
  },
  tabText: {
    color: 'gray',
    fontSize: 14,
  },
  tabTextActive: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transcriptionContainer: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    padding: 15,
  },
  transcription: {
    color: 'white',
    fontSize: 16,
    marginBottom: 10,
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  playButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1c1c1e', 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
    left: 160
  },
  playButton1: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1c1c1e', 
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
    left: -150
  },
  image: {
    width: '100%', height: 400
  },  video: { width: '100%', height: 200 },
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
  modeText: {
    color: 'white',
    fontSize: 15, 
    marginRight: 4,
    padding:12,
    borderRadius: 30,
    backgroundColor: '#1c1c1e', 
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
