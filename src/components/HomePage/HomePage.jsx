import React, { useState, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, ScrollView, FlatList, useColorScheme, Modal, Image, TextInput,Dimensions  } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ProfilePage from '../LogOut/ProfilePage';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from '@react-native-picker/picker';
import { useNavigation, StackActions } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { Audio, Video } from 'expo-av';

const { height , width } = Dimensions.get('window');
const HomePage = () => {
  const [folderUri, setFolderUri] = useState(null); 
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [user, setUser] = useState(null);
  const [showSelection, setShowSelection] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const colorScheme = useColorScheme();
  const [modes, setModes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [displayItems, setDisplayItems] = useState({});

  useEffect(() => {
    const loadDisplayItems = async () => {
      try {
        const storedDisplayItems = await AsyncStorage.getItem('displayItems');
        if (storedDisplayItems) {
          setDisplayItems(JSON.parse(storedDisplayItems));
        }
      } catch (error) {
        console.error('Failed to load display items:', error);
      }
    };
    loadDisplayItems();
  }, []);

  const getFilesFromFolder = async () => {
    if (!folderUri) return;
    try {
      const folderInfo = await FileSystem.getInfoAsync(folderUri);
      if (!folderInfo.exists) return;
      const files = await FileSystem.readDirectoryAsync(folderUri);
      const filesInfo = await Promise.all(
        files.map(async (file) => {
          const fileInfo = await FileSystem.getInfoAsync(`${folderUri}${file}`);
          const fileExtension = file.split('.').pop();
          const createdAt = fileInfo.modificationTime
            ? new Date(fileInfo.modificationTime).toLocaleString()
            : 'Unknown';
          return {
            id: fileInfo.uri,
            name: file,
            type: fileExtension,
            createdAt: createdAt,
          };
        })
      );
      const sortedFiles = sortFilesByDateDesc(filesInfo);
      setRecentFiles(sortedFiles);
    } catch (error) {
      console.error('Error reading files:', error);
    }
  };

  useEffect(() => { 
    const loadDefaultFolder = async () => {
      const storedUri = await AsyncStorage.getItem('defaultFolderUri');
      setFolderUri(storedUri || `${FileSystem.documentDirectory}OmniCapture/`); 
    };
    loadDefaultFolder();
  }, []);

  useEffect(() => {
    if (folderUri) {
      getFilesFromFolder();
    }
  }, [folderUri]);

  
  const transcribeAudio = async (uri) => {
    setLoading(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileExtension = fileInfo.uri.split('.').pop();
      let fileType = '';
      const id = uri.split('/').pop();
      const recordingData = await AsyncStorage.getItem(`recording_${id}`);
      let transcriptionUri, summaryUri;
      if (recordingData) {
        const parsedData = JSON.parse(recordingData);
        transcriptionUri = parsedData.transcriptionUri;
        summaryUri = parsedData.summaryUri;
      } else {
        console.warn("Aucun enregistrement trouvé pour cet ID dans AsyncStorage.");
      }
      setLoading(false);
      navigation.navigate('Result', { 
        transcription: '', 
        audioUri: uri, 
        transcriptionUr: transcriptionUri, 
        summaryUr: summaryUri, 
        mode: selectedMode ||  {"language": "English", "name": "No Mode", "prompt": "", "voiceModel": ""}
 
      });
    } catch (error) {
      console.error('Erreur lors de la transcription :', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };
  
  
  const sortFilesByDateDesc = (files) => {
    return files.sort((a, b) => {
      const getDateFromFileName = (fileName) => {
        const fileNameParts = fileName.split('_');
        if (fileNameParts.length >= 3) {
          const datePart = fileNameParts[1];
          const timePart = fileNameParts[2].replace(/-/g, ':');
          return new Date(`${datePart} ${timePart}`);
        }
        return new Date(0);
      };

      const dateA = getDateFromFileName(a.name);
      const dateB = getDateFromFileName(b.name);
      return dateB - dateA;
    });
  };

  const defaultModes = [
    { name: 'No Mode', prompt: '', voiceModel: '', language: '' },
    { name: 'Email', prompt: 'Handle emails', voiceModel: 'Standard (English)', language: 'English' },
    { name: 'Journal', prompt: 'Write journals', voiceModel: 'Advanced (English)', language: 'English' },
    { name: 'Messages', prompt: 'Send messages', voiceModel: 'Premium (English)', language: 'English' },
    { name: 'Note', prompt: 'Take notes', voiceModel: 'Standard (English)', language: 'English' },
  ];

  useEffect(() => {
    const loadModes = async () => {
      try {
        const storedModes = await AsyncStorage.getItem('modes');
        if (storedModes) {
          const parsedStoredModes = JSON.parse(storedModes);
          const missingDefaultModes = defaultModes.filter(
            (defaultMode) => !parsedStoredModes.some((storedMode) => storedMode.name === defaultMode.name)
          );
          if (missingDefaultModes.length > 0) {
            const updatedModes = [...parsedStoredModes, ...missingDefaultModes];
            await AsyncStorage.setItem('modes', JSON.stringify(updatedModes));
            setModes(updatedModes);
          } else {
            setModes(parsedStoredModes);
          }
        } else {
          await AsyncStorage.setItem('modes', JSON.stringify(defaultModes));
          setModes(defaultModes);
        }
      } catch (error) {
        console.error('Failed to load modes:', error);
      }
    };
    loadModes();
  }, []);

 

  useEffect(() => {
    const fetchUser = async () => {
      const email = await AsyncStorage.getItem('email');
      setUser(email);
    };
    fetchUser();
  }, []);


  const handlePlayVideo = (fileUri) => {
    setSelectedFile({ uri: fileUri, type: 'video' });
    navigation.navigate('Result', { 
      audioUri: fileUri,  
      mode: selectedMode || { language: 'English' } 
    });
  };

  const handleViewImage = async (fileUri) => {
    const id = fileUri.split('/').pop();
    const recordingData = await AsyncStorage.getItem(`recording_${id}`);
    let transcriptionUri, summaryUri;
    if (recordingData) {
      const parsedData = JSON.parse(recordingData);
      transcriptionUri = parsedData.transcriptionUri;
      summaryUri = parsedData.summaryUri;
    } else {
      console.warn("Aucun enregistrement trouvé pour cet ID dans AsyncStorage.");
    }

    const fileName = fileUri.split('/').pop(); 
    const storageKey = `${fileName}_recognizedText`;
    AsyncStorage.getItem(storageKey)
    .then((recognizedText) => {
      navigation.navigate('Result', {
        audioUri: fileUri,
        mode: selectedMode || { language: 'English' },
        transcriptionUr: transcriptionUri, 
        summaryUr: summaryUri, 
        recognizedText: recognizedText || null
      });
    })
    .catch((error) => {
      console.error('Error retrieving recognizedText:', error);
      navigation.navigate('Result', {
        audioUri: fileUri,
        mode: selectedMode || { language: 'English' },
        recognizedText: null
      });
    });
  };

  const handleViewText = async (fileUri) => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      setSelectedFile({ uri: fileUri, type: 'text', content: fileContent });
      navigation.navigate('Result', { 
        audioUri: fileUri,  
        mode: selectedMode || { language: 'English' } 
      });
    } catch (error) {
      console.error('Error reading text file:', error);
    }
  };

  const handleFilePress = (file) => {
  const { type, id } = file;
  if (type === 'mp3' || type === 'm4a' || type === 'mpeg'|| type === 'wav') {
    transcribeAudio(id);
  } else if (type === 'mp4' || type === 'mov') {
    handlePlayVideo(id);
  } else if (type === 'jpg' || type === 'jpeg' || type === 'png') {
    handleViewImage(id);
  } else if (type === 'txt' || type === 'doc' || type === 'docx' || type === 'pdf') {
    handleViewText(id);
  }
};
const handleTextChange = async (id, newText) => {
  const updatedDisplayItems = {
    ...displayItems,
    [id]: newText,
  };
  setDisplayItems(updatedDisplayItems);

  try {
    await AsyncStorage.setItem('displayItems', JSON.stringify(updatedDisplayItems));
  } catch (error) {
    console.error('Failed to save display items:', error);
  }
};
  const renderItem = ({ item }) => {
    if (item.name.endsWith('transcription.txt') || item.name.endsWith('summary.txt')) {
      return null; 
    }
    const fileNameParts = item.name.split('_');
    let displayDate = 'Unknown';
    let initialDisplayItem = 'Unknown';
    if (fileNameParts.length >= 3) {
      const datePart = fileNameParts[1];
      const timePart = fileNameParts[2].replace(/-/g, ':');
      const modePart = fileNameParts[3];

      displayDate = `${datePart} ${timePart}`;
      initialDisplayItem = `${datePart}_${modePart}`;

    }
    

    const isAudioFile = item.type === 'mp3' || item.type === 'm4a' || item.type === 'mpeg'|| item.type ==='wav';
    const isImageFile = item.type === 'jpg' || item.type === 'jpeg' || item.type === 'png';
    const isVideoFile = item.type === 'mp4' || item.type === 'mov';
    const isTextFile = item.type === 'txt' || item.type === 'doc' || item.type === 'pdf';

    let iconName = 'document-outline';
if (isAudioFile) {
  iconName = 'mic-outline';
} else if (isImageFile) {
  iconName = 'image-outline';
} else if (isVideoFile) {
  iconName = 'videocam-outline';
} else if (isTextFile) {
  iconName = 'document-text-outline';
}


    return (
      <View style={styles.fileItemContainer} >
        <Text style={styles.createdAt}>Created at {displayDate}</Text>
      <TouchableOpacity style={styles.fileItem} onPress={() => handleFilePress(item)} >
        <Text style={styles.point}>•</Text>
        <Ionicons name={iconName} style={styles.fileIcon} />
        <View>
        <TextInput
              style={styles.fileName}
              value={displayItems[item.id] || initialDisplayItem}
              onChangeText={(text) => handleTextChange(item.id, text)}
              placeholder="Enter text"
            />
                    </View>
      </TouchableOpacity>
      </View>
    );
  };

  const handleOpenSettings = () => {
    navigation.dispatch(StackActions.replace('SettingsPage'));
  };

  const handleOpenProfile = () => {
    setShowProfile(true);
  };

  const handleBackToHome = () => {
    setShowProfile(false);
  };

  const toggleSelection = (buttonLabel) => {
    if (buttonLabel) {
      setSelectedLabel(buttonLabel);
    }
    setShowModal(true);
    setShowSelection(!showSelection);
  };

  const handleModeSelect = (mode) => {
    if (mode) {
      setSelectedMode(mode);
      setShowSelection(false);
      setShowModal(false);
    } else {
      console.log('No mode selected');
    }
  };

  if (showProfile) {
    return <ProfilePage onBack={handleBackToHome} />;
  }

  if (selectedLabel === 'Voice Memo' && selectedMode) {
    navigation.dispatch(StackActions.replace('VoiceMemoPage', { mode: selectedMode }));  }
  if (selectedLabel === 'Scan Text'&& selectedMode) {
    navigation.dispatch(StackActions.replace('TextRecognitionComponent'));
  }
  if (selectedLabel === 'Media'&& selectedMode) {
    navigation.dispatch(StackActions.replace('MediaImportComponent'));
  }
  if (selectedLabel === 'Camera' && selectedMode) {
    navigation.dispatch(StackActions.replace('CameraCaptureComponent'));
  }
  if (selectedLabel === 'Video' && selectedMode) {
    navigation.dispatch(StackActions.replace('VideoCaptureComponent'));
  }
  if (selectedLabel === 'URL' && selectedMode) {
    navigation.dispatch(StackActions.replace('UrlImportComponent'));
  }
  if (selectedLabel === 'Files' && selectedMode) {
    navigation.dispatch(StackActions.replace('FileImportComponent'));
  }
  if (selectedLabel === 'Write' && selectedMode) {
    navigation.dispatch(StackActions.replace('TextWriteComponent'));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>OmniCapture</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconButton} onPress={handleOpenSettings}>
            <Ionicons name="settings-outline" size={32}style={styles.headerIcon} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleOpenProfile}>
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>{user?.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.thinLine}></View>
      {recentFiles.length === 0 ? (
        <View style={styles.emptyMessageContainer}>
          <Text style={styles.emptyMessage}>There is no file</Text>
        </View>
      ) : (
        <FlatList
          data={recentFiles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.fileList}
          contentContainerStyle={{ paddingBottom: 20 }}
          initialNumToRender={3}
          showsVerticalScrollIndicator={false}
        />
      )}
      <View style={styles.thickLine}></View>

      <ScrollView contentContainerStyle={styles.actionButtons}  scrollEnabled={false} >
        {['Scan Text', 'Files', 'Media', 'Voice Memo', 'Camera', 'Write', 'URL', 'Video'].map((buttonLabel, index) => (
          <TouchableOpacity key={index} style={styles.button} onPress={() => toggleSelection(buttonLabel)}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
            <Ionicons
  name={
    buttonLabel === 'Scan Text' ? 'scan' :
    buttonLabel === 'Files' ? 'folder-open-outline' :
    buttonLabel === 'Media' ? 'images-outline' :
    buttonLabel === 'Voice Memo' ? 'mic-outline' :
    buttonLabel === 'Camera' ? 'camera-outline' :
    buttonLabel === 'Write' ? 'pencil-outline' :
    buttonLabel === 'URL' ? 'link-outline' :
    'videocam-outline'
  }
  style={styles.icon}
/>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={showModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.selectionTitle}>Select Mode</Text>
            {Platform.OS === 'ios' ? (
              <Picker
                selectedValue={selectedMode?.name}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                onValueChange={(selectedModeName) => {
                  const selectedModeObject = modes.find((mode) => mode.name === selectedModeName);
                  handleModeSelect(selectedModeObject);
                }}
              >
                <Picker.Item label="Mode" value="" />
                {modes.map((mode, index) => (
                  <Picker.Item key={index} label={mode.name} value={mode.name} />
                ))}
              </Picker>
            ) : (
              <FlatList
  data={modes}
  keyExtractor={(item) => item.name}
  renderItem={({ item }) => (
    <TouchableOpacity
      style={styles.selectionButton}
      onPress={() => handleModeSelect(item)}
    >
      <Text style={styles.selectionButtonText}>{item.name}</Text>
    </TouchableOpacity>
  )}
  showsVerticalScrollIndicator={false}
  style={styles.flatList}
/>

            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowModal(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showFileModal}
        transparent={true}
        onRequestClose={() => setShowFileModal(false)}
      >
        <View style={styles.modalContent1}>
          {selectedFile?.type === 'image' && (
            <Image source={{ uri: selectedFile.uri }} style={styles.modalImage} />
          )}
          {selectedFile?.type === 'video' && (
            <Video
              source={{ uri: selectedFile.uri }}
              rate={1.0}
              volume={1.0}
              isMuted={false}
              resizeMode="cover"
              shouldPlay
              style={styles.modalVideo}
            />
          )}
          {selectedFile?.type === 'text' && (
            <ScrollView style={styles.modalTextContainer}>
              <Text style={styles.modalText}>{selectedFile.content}</Text>
            </ScrollView>
          )}
          <TouchableOpacity onPress={() => setShowFileModal(false)} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};


const styles = StyleSheet.create({
  
  modalVideo: { width: 300, height: 300 },
 

  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    paddingTop: 25,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
  },
  headerIcon: {
    color: '#fff',
    padding:6
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileIcon: {
    backgroundColor: '#2f2f31',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  thinLine: {
    borderBottomColor: '#fff',
    borderBottomWidth: 0.2,
    marginVertical: 15,
  },
  point: {
    color: '#fff',
    marginRight: 8,
    fontSize: 34,
    alignSelf: 'center',
  },
  fileList: {
    marginBottom: 2,
    maxHeight:height * 0.38,
    minHeight: height * 0.35,
  },
  fileItemContainer: {
    marginBottom: 8,
  },
  createdAt: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomColor: '#2a2a2e',
    borderBottomWidth: 1,
    backgroundColor: '#2f2f31',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  fileIcon: {
    fontSize: 24,
    color: '#fff',
    marginRight: 15,
  },
  fileName: {
    color: '#fff',
    fontSize: 12.5,
    fontWeight: '600',
  },
  thickLine: {
    borderBottomColor: '#fff',
    borderBottomWidth: 6,
    marginVertical: 20,
    width: width *0.3, 
    borderRadius: 20, 
    alignSelf: 'center', 
  },
  actionButtons: {
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    minHeight: height * 0.53,
    maxHeight: height * 0.45,
    
  }, 
  button: {
    backgroundColor: '#2a2a2e', 
    paddingVertical: 15, 
    paddingHorizontal: 25, 
    borderRadius: 10, 
    marginVertical: 10, 
    width: '48%', 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
  }, 
  icon: { 
    color: '#fff', 
    fontSize: 24, 
  }, 
  buttonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '600', 
  }, 
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  }, 
  selectionContainer: { 
    backgroundColor: '#2f2f31', 
    padding: 20, 
    borderRadius: 10, 
    width: '80%', 
    alignItems: 'center',

  }, 
  selectionTitle: { 
    color: '#fff', 
    fontSize: 20, 
    marginBottom: 15, 
    textAlign: 'center', 
  }, 
  flatList: {
    maxHeight: 190, 
  },
  selectionButton: { 
    paddingVertical: 10,
    paddingHorizontal: 10,
    width: "100%",
        alignItems: 'center',
   }, 
   selectionButtonText: { 
    width:'100%',
    color: '#fff', 
    fontSize: 18, 
    textAlign: 'center', 
    backgroundColor: 'rgba(60, 60, 60, 0.9)',
    borderRadius: 12,
    elevation: 5,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 },
    paddingLeft:30,
    paddingRight:30,
    paddingBottom:10,
    paddingTop:10,
   
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    paddingVertical:  10,
    paddingHorizontal:  30, 
  },
   closeButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    
  },
  pickerContainer: {
    width: '100%',
    marginVertical: 16,
  },
  picker: {
    height: Platform.OS === 'android' ? 150 : 200, 
    width: '100%',
    color: Platform.OS === 'android' ? '#000' : '#fff', 
    backgroundColor: Platform.OS === 'android' ? '#f0f0f0' : '#1c1c1e', 
  },
  pickerItem: {
    fontSize: 16,
    color: Platform.OS === 'android' ? '#000' : '#fff', 
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alreadySelectedText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 24,
  },
  modalContent1: { 
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginVertical: 46,
    padding: 25, 
    borderWidth:  0, 
    borderColor:  'transparent', 
    width: '100%', 
    backgroundColor: '#1c1c1e',
    borderRadius: 15, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.8, 
    shadowRadius: 3, 
    elevation: 5,
  },
  
  modalTextContainer: { 
   
    borderRadius: 12, 
    width: '100%', 
  
  },
  modalText: { 
    fontSize: 18, 
    color: '#ffffff', 
    lineHeight: 26, 
   
  },
  modalImage: { width: 300, height: 300 },

  modalContent: {
    backgroundColor: '#1c1c1e',
    padding:20, 
    borderRadius:  10, 
    width: '80%',
    alignItems: 'center',
    borderWidth:  0, 
    borderColor: 'transparent', 
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: height * 0.38,
    maxHeight: height * 0.39,
  },
  emptyMessage: {
    color: '#888',
    fontSize: 18,
  },

});

    export default HomePage;