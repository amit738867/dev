import React, { useEffect, useState } from 'react';
import LottieView from 'lottie-react-native'; 
import { Image,View, Text, TouchableOpacity, StyleSheet, Switch, ScrollView, Alert, Platform, Modal, FlatList, TextInput } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 
import { useNavigation, StackActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Audio, Video } from 'expo-av';
const SettingsPage = () => {
  const [currentDirectory, setCurrentDirectory] = useState(`${FileSystem.documentDirectory}`);
  const navigation = useNavigation();
  const [aiModelEnabled, setAiModelEnabled] = useState(true);
  const [modes, setModes] = useState([]);
  const [folderUri, setFolderUri] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [customFolderName, setCustomFolderName] = useState('');
  const [folders, setFolders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [audioPlaybackObject, setAudioPlaybackObject] = useState(null);
  const [showFileModal, setShowFileModal] = useState(false);
  const [loading, setLoading] = useState(false);


const loadFolders = async () => {
  try {
    const fileList = await FileSystem.readDirectoryAsync(currentDirectory);
    const folderData = await Promise.all(
      fileList.map(async (name) => {
        const info = await FileSystem.getInfoAsync(`${currentDirectory}${name}`);
        return { name, uri: info.uri, isDirectory: info.isDirectory };
      })
    );
    setFolders(folderData);
  } catch (error) {
    console.error('Error loading folders:', error);
  }
};

const navigateUp = () => {
  const parentDirectory = currentDirectory.split('/').slice(0, -2).join('/') + '/';
  setCurrentDirectory(parentDirectory);
};

 const setDefaultFolder = async (uri) => {
    await AsyncStorage.setItem('folderUri', uri);
    setFolderUri(uri);
    await AsyncStorage.setItem('defaultFolderUri', uri);
    Alert.alert('Default Folder Set');
    navigation.dispatch(StackActions.replace('Accueil'));

  };

  const defaultFolderUri = `${FileSystem.documentDirectory}`;

  const openFile = async (file) => {
    setSelectedFile(file);
  };

  const defaultModes = [
    { name: 'No Mode', prompt: '', voiceModel: '', language: '' },
    { name: 'Email', prompt: 'Handle emails', voiceModel: 'Standard (English)', language: 'English' },
    { name: 'Journal', prompt: 'Write journals', voiceModel: 'Advanced (English)', language: 'English' },
    { name: 'Messages', prompt: 'Send messages', voiceModel: 'Premium (English)', language: 'English' },
    { name: 'Note', prompt: 'Take notes', voiceModel: 'Standard (English)', language: 'English' },

  ];
  useEffect(() => {
    const loadFolderUri = async () => {
      const savedUri = await AsyncStorage.getItem('folderUri');
      if (savedUri) setFolderUri(savedUri);
    };
    loadFolderUri();
  }, []);

  useEffect(() => {
    if (modalVisible) {
      loadFilesInDirectory(defaultFolderUri);
    }
  }, [modalVisible]);

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

  

   const loadFilesInDirectory = async (path) => {
    try {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true });
      const fileList = await FileSystem.readDirectoryAsync(path);
      const fileData = await Promise.all(
        fileList.map(async (fileName) => {
          const info = await FileSystem.getInfoAsync(path + fileName);
          return { name: fileName, uri: info.uri, isDirectory: info.isDirectory };
        })
      );
      setFiles(fileData);
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers :', error);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'm4a':
      case 'mp3':
      case 'mpeg':
        return 'musical-notes-outline';
      case 'mp4':
      case 'mov':
        return 'videocam';
      case 'pdf':
      case 'txt':
      case 'doc':
        return 'document-text-outline';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'image-outline';
      default:
        return 'document-outline';
    }
  };
 
  

 

  const createNewFolder = async () => {
    if (customFolderName.trim()) {
      const newFolderUri = `${currentDirectory}${customFolderName}/`;
      await FileSystem.makeDirectoryAsync(newFolderUri, { intermediates: true });
      setCustomFolderName(''); 
      loadFolders(); 
      Alert.alert('Folder Created');
    } else {
      Alert.alert('Error', 'Please enter a name for the folder.');
    }
  };
  useEffect(() => {
    loadFolders();
  }, [currentDirectory]);
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  
  const deleteMode = async (modeName) => {
    Alert.alert(
      'Delete Mode',
      `Are you sure you want to delete the mode: ${modeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedModes = modes.filter((mode) => mode.name !== modeName);
              setModes(updatedModes);
              await AsyncStorage.setItem('modes', JSON.stringify(updatedModes));
            } catch (error) {
              console.error('Failed to delete mode:', error);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const onBack = () => {
    navigation.dispatch(StackActions.replace('Accueil'));
  };

  const editMode = (mode) => {
    navigation.dispatch(StackActions.replace('NewMode', { mode, isEdit: true, updateMode }));
  };

  const updateMode = async (updatedMode) => {
    const updatedModes = modes.map((mode) =>
      mode.name === updatedMode.name ? updatedMode : mode
    );
    setModes(updatedModes);
    await AsyncStorage.setItem('modes', JSON.stringify(updatedModes));
  };

  const addMode = (newMode) => {
    setModes([...modes, newMode]);
  };

  const navigateToCreateNewMode = () => {
    navigation.dispatch(StackActions.replace('NewMode', { addMode }));
  };

  const toggleAiModel = () => {
    setAiModelEnabled((previousState) => !previousState);
  };

  const navigateToIntegrations = () => {
    navigation.dispatch(StackActions.replace('IntegrationsPage'));
  };
  const filteredFolders = folders.filter((folder) => folder.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handlePlayAudio = async (fileUri) => {
    const playbackObject = new Audio.Sound();
    try {
      await playbackObject.loadAsync({ uri: fileUri });
      await playbackObject.playAsync();
      setAudioPlaybackObject(playbackObject);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handlePlayVideo = (fileUri) => {
    setLoading(true);
    setSelectedFile({ uri: fileUri, type: 'video' });
    setModalVisible(false);
    setTimeout(() => {
      setShowFileModal(true);
      setLoading(false); 
    }, 500);
  };

  const handleViewImage = (fileUri) => {
    setLoading(true); 
    setSelectedFile({ uri: fileUri, type: 'image' });
    setModalVisible(false);
  
    setTimeout(() => {
      setShowFileModal(true);
      setLoading(false); 
    }, 500); 
  };
  
  const closee =()=>{
    setLoading(true);
    setShowFileModal(false);

    setTimeout(() => {
      setModalVisible(true);
      setLoading(false); 
    }, 500);
    
  }

  const handleViewText = async (fileUri) => {
    setLoading(true); 
    
    
    
    try {
      setModalVisible(false);
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      setSelectedFile({ uri: fileUri, type: 'text', content: fileContent });
      setTimeout(() => {
        setShowFileModal(true);
        setLoading(false); 
      }, 500);
    } catch (error) {
      console.error('Error reading text file:', error);
    }
  };

  const handleOpenFolder = async (folder) => {
    if (folder.isDirectory) {
      setCurrentDirectory(folder.uri);
      loadFolders();
    }else{
      
    }
  };
  const handleFilePress = (file) => {
    const id = file.uri;
    const extension = file.name.split('.').pop().toLowerCase();
    const type = file.type || extension;  // Use type if it exists; otherwise, fallback to extension
   
    if (type === 'mp3' || type === 'm4a' || type === 'mpeg') {
     
      handlePlayAudio(id);
    } else if (type === 'mp4' || type === 'mov') {
      handlePlayVideo(id);
    } else if (type === 'jpg' || type === 'jpeg' || type === 'png') {
      handleViewImage(id);
    } else if (type === 'txt' || type === 'doc' || type === 'docx' || type === 'pdf') {
      handleViewText(id);
    } else {
      console.warn('Unsupported file type:', type);
    }
  };
  

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="chevron-back" size={32} color="#007aff" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}></Text>
          <TouchableOpacity onPress={navigateToCreateNewMode}>
            <Text style={styles.newModeText}>New Mode</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MODES</Text>
          {modes.length > 0 ? (
            modes.map((mode, index) => (
              <View key={index} style={styles.optionContainer}>
                <TouchableOpacity style={styles.option} onPress={() => editMode(mode)}>
                  <Text style={styles.optionText}>{mode.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteMode(mode.name)} style={styles.deleteButton}>
                  <Ionicons name="trash-outline" size={20} color="red" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text>No modes available</Text>
          )}
          <TouchableOpacity onPress={navigateToCreateNewMode}>
            <Text style={styles.createNewModeText}>Create New Mode</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APPLICATION</Text>
          <TouchableOpacity onPress={navigateToIntegrations} style={styles.option}>
            <Text style={styles.optionText}>Integrations</Text>
            <Ionicons name="chevron-forward" size={20} color="#6c6c70" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.option}>
            <Text style={styles.optionText}>Folder location</Text>
            <Ionicons name="folder-outline" size={20} color="#6c6c70" />
          </TouchableOpacity>
          {[ 'Subscription', 'Account'].map((appOption, index) => (
            <TouchableOpacity key={index} style={styles.option}>
              <Text style={styles.optionText}>{appOption}</Text>
              <Ionicons name="chevron-forward" size={20} color="#6c6c70" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AIMODELS</Text>
          <View style={styles.aiModelOption}>
            <Text style={styles.optionText}>Enabled</Text>
            <Switch
              value={aiModelEnabled}
              onValueChange={toggleAiModel}
              trackColor={{ false: "#767577", true: "#34C759" }}
              thumbColor={aiModelEnabled ? "#ffffff" : "#f4f3f4"}
            />
          </View>
          <View style={styles.option}>
            <Text style={styles.optionText}>Provider</Text>
            <Text style={styles.optionDetail}>OpenAI</Text>
          </View>
          <View style={styles.option}>
            <Text style={styles.optionText}>Model</Text>
            <Text style={styles.optionDetail}>GPT-3.5Turbo</Text>
          </View>
        </View>

        
      {loading ? (
  <View style={styles.loadingContainer}>
    <LottieView
      source={require('../../../assets/DID.json')}
      autoPlay
      loop
      resizeMode="cover"
      style={styles.lottie}
    />
  </View>
):(

      <>
      <Modal visible={modalVisible} animationType="fade">
  <View style={styles.modalContainer}>
    <View style={styles.modalHeader}>
      <TouchableOpacity onPress={() => setModalVisible(false)}>
        <Ionicons name="chevron-back" size={24} color="#007aff" />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>OmniCapture</Text>
        <TouchableOpacity onPress={navigateUp} style={styles.backButton}>
          <Ionicons name="arrow-up" size={24} color="#007aff" />
          <Text style={styles.upText}>Back</Text>
        </TouchableOpacity>     
    </View>

    <TextInput
      style={styles.searchBar}
      placeholder="Recherche"
      placeholderTextColor="#8e8e93"
      onChangeText={setSearchQuery}
      value={searchQuery}
    />

    <FlatList
      data={folders}
      keyExtractor={(item) => item.uri}
      numColumns={3}
      renderItem={({ item }) => (
        <View style={styles.fileItem}>
<TouchableOpacity
  style={styles.folderContainer}
  onPress={() => item.isDirectory ? handleOpenFolder(item) : handleFilePress(item)}
>
            <Ionicons
            name={item.isDirectory ? "folder" : getFileIcon(item.name)}
            size={40}
            color="#007aff"
          />
          <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
        </TouchableOpacity>
        {item.isDirectory && (
        <TouchableOpacity onPress={() => setDefaultFolder(item.uri)} style={styles.setDefaultButton}>
          <Text style={styles.setDefaultButtonText}>Set as Default</Text>
        </TouchableOpacity>
      )}
      </View>

        
      )}
    />

    <View style={styles.newFolderContainer}>
      <TextInput
        style={styles.newFolderInput}
        placeholder="Nom du nouveau dossier"
        placeholderTextColor="#8e8e93"
        value={customFolderName}
        onChangeText={setCustomFolderName}
      />
      <TouchableOpacity onPress={createNewFolder} style={styles.createButton}>
        <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
      </TouchableOpacity>
    </View>
  </View>
</Modal>

      <Modal
        visible={showFileModal}
        transparent={true}
        onRequestClose={() => setShowFileModal(false)}
        animationType="fade"
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
          <TouchableOpacity onPress={closee} style={styles.closeButton1}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      </>
  )}
      </ScrollView>

      
    </View>
  );
};





const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollViewContent: {
    flexGrow: 1, 
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 40,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#000',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#007aff',
    fontSize: 18,
    marginLeft: 5,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
    backgroundColor: '#000',
    paddingBottom: 20,
    paddingLeft: 10,
  },
  newModeText: {
    color: '#007aff',
    fontSize: 16,
  },
  section: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    borderColor: '#3a3a3c',
    borderWidth: 1,
  },
  sectionTitle: {
    color: '#8e8e93',
    fontSize: 10,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomColor: '#3a3a3c',
    borderBottomWidth: 1,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  optionDetail: {
    color: '#8e8e93',
    fontSize: 16,
  },
  createNewModeText: {
    color: '#007aff',
    fontSize: 16,
    marginTop: 10,
  },
  aiModelOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomColor: '#3a3a3c',
    borderBottomWidth: 1,
  },
  deleteButton: {
    paddingLeft: 8,
  },
  optionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  folderUriText: { fontSize: 12, color: '#666', marginTop: 5 },
  modalContainer: {
    zIndex:-1,
    flex: 1,
    backgroundColor: '#1c1c1e',
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  folderOption: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#2c2c2e',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderNameInput: {
    width: '100%',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#3a3a3c',
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 15,
  },
  createButton: {
    width: '100%',
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#6c6c70',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton1: {
    marginTop: 20,
    backgroundColor: '#ff4757',
    borderRadius: 10,
    paddingVertical: Platform.OS === 'android' ? 8 : 10,
    paddingHorizontal: Platform.OS === 'android' ? 25 : 30, 
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },


  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upText: {
    marginLeft: 4,
    color: '#007aff',
    fontWeight: 'bold',
  },

  modalContainer: { flex: 1, backgroundColor: '#1c1c1e' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#000',paddingTop:50 , justifyContent: 'space-between',},
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 15 },
  searchBar: { margin: 15, padding: 10, backgroundColor: '#2c2c2e', borderRadius: 8, color: '#fff' },
  fileItem: {
    flex: 1,
    alignItems: 'center',
    margin: 10,
    padding: 10,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    width: '30%',
  },
  fileName: { marginTop: 5, color: '#fff', fontSize: 14, textAlign: 'center', maxWidth: '100%' },
  fileDate: { color: '#8e8e93', fontSize: 12, marginTop: 2 },
  newFolderContainer: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#2c2c2e' },
  newFolderInput: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#3a3a3c', color: '#fff', marginRight: 10 },
  createButton: { padding: 10, backgroundColor: '#007aff', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  fileContentContainer: { flex: 1, backgroundColor: '#1c1c1e', justifyContent: 'center', alignItems: 'center' },
  closeButton: { position: 'absolute', top: 40, right: 20 },
  content: { alignItems: 'center', justifyContent: 'center' },
  playButton: { padding: 20, backgroundColor: '#2c2c2e', borderRadius: 50 },
  video: { width: '100%', height: 300 },
  textContent: { padding: 20 },
  text: { color: '#fff', fontSize: 16 },
  image: { width: '100%', height: 300, resizeMode: 'contain' },
  modalContent1: { 
    zIndex:2,
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center', 
    alignItems: 'center', 
    marginVertical: 46,
    padding: Platform.OS === 'android' ? 20 : 25, 
    borderWidth: Platform.OS === 'android' ? 1 : 0, 
    borderColor: Platform.OS === 'android' ? '#888' : 'transparent', 
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
    padding: Platform.OS === 'android' ? 15 : 20, 
    borderRadius: Platform.OS === 'android' ? 5 : 10, 
    width: '80%',
    alignItems: 'center',
    borderWidth: Platform.OS === 'android' ? 1 : 0, 
    borderColor: Platform.OS === 'android' ? '#888' : 'transparent', 
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight:200

  },
  emptyMessage: {
    color: '#888',
    fontSize: 18,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    
    width: '100%',
    height: '100%',
  },
  lottie: {
    width: 100,
    height: 100,
  },
   folderContainer: {
    alignItems: 'center',
    margin: 5,
    padding: 5,
    borderRadius: 8,
  },
  setDefaultButton: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#007aff',
    borderRadius: 6,
  },
  setDefaultButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
});

export default SettingsPage;
