import React, { useEffect, useState } from 'react';
import { Button,View,TextInput, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert,Modal } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, StackActions } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from 'axios';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import RNFetchBlob from 'react-native-blob-util';
import LottieView from 'lottie-react-native';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@env';
GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  scopes: ['https://www.googleapis.com/auth/drive.file'], 
  offlineAccess: true,
  forceCodeForRefreshToken: true,
});


const IntegrationsPage = () => {
  const navigation = useNavigation();
  const [accessToken, setAccessToken] = useState(null);
  const [folderId, setFolderId] = useState(null);
  const [folderName, setFolderName] = useState('OmniCapture');
  const [isLoading, setIsLoading] = useState(false); 
  const [modalVisible, setModalVisible] = useState(false);
  const [modalVisiblee, setModalVisiblee] = useState(false);
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/drive.file'], 
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  
 
  const checkOrCreateFolder = async (accessToken) => {
    if (!accessToken) return;
    try {
        const response = await axios.get(
        `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
        if (response.data.files.length > 0) {
        const existingFolderId = response.data.files[0].id;
        setFolderId(existingFolderId);
        const folderDetails = await axios.get(
          `https://www.googleapis.com/drive/v3/files/${existingFolderId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (folderDetails.status === 200) {
        setFolderId(existingFolderId);
        console.log('Dossier prêt à l\'utilisation.');
        return existingFolderId;
    } else {
      return  createNewFolder(accessToken);
    }

      } else {
        createNewFolder(accessToken);
      }
    } catch (error) {
      console.error("Erreur lors de la vérification ou création du dossier :", error);
    }
  };
  
const createNewFolder = async (accessToken) => {
  try {
      const createFolderResponse = await axios.post(
          'https://www.googleapis.com/drive/v3/files',
          {
              name: folderName,
              mimeType: 'application/vnd.google-apps.folder',
          },
          {
              headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
              },
          }
      );
      const newFolderId = createFolderResponse.data.id;
      setFolderId(newFolderId);
      console.log(`Nouveau dossier créé avec ID : ${newFolderId}`);
      return newFolderId
  } catch (error) {
      console.error("Erreur lors de la création du dossier :", error);
  }
};

  const uploadFolderToDrive = async (folderPath, driveParentId = folderId) => {
    try {
      const token = await AsyncStorage.getItem('token'); // Récupérer le jeton d'accès
      if(folderId === 'null'){
        checkOrCreateFolder(token)
      }
      if (!token) {
        console.error("Token is missing or invalid");
        return;
      }
      const items = await FileSystem.readDirectoryAsync(folderPath);
      console.log(`Contenu de ${folderPath} :`, items); 
      for (const itemName of items) {
        const itemPath = `${folderPath}${itemName}`;
        const itemInfo = await FileSystem.getInfoAsync(itemPath);
    
        if (itemInfo.isDirectory) {
          console.log('file info :', itemInfo)
          const createFolderResponse = await axios.post(
            'https://www.googleapis.com/drive/v3/files',
            {
              name: itemName,
              mimeType: 'application/vnd.google-apps.folder',
              parents: [driveParentId],
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );
          const newDriveFolderId = createFolderResponse.data.id;
          await uploadFolderToDrive(itemPath + '/', newDriveFolderId);
  
        } else {
        console.log("Téléchargement du fichier :", itemPath);
        const fileExistsResponse = await axios.get(
          `https://www.googleapis.com/drive/v3/files?q='${driveParentId}' in parents and name='${itemName}' and trashed=false`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (fileExistsResponse.data.files.length > 0) {
          console.log(`File ${itemName} already exists in Drive. Skipping upload.`);
          continue; 
        }

        
        const fileData = await RNFetchBlob.fs.readFile(itemPath, 'base64');
        const fileMetadata = {
          name: itemName,
          parents: [driveParentId],
        };

        const metadataResponse = await axios.post(
          'https://www.googleapis.com/drive/v3/files',
          fileMetadata,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        const fileId = metadataResponse.data.id;
        const response = await axios.patch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          await RNFetchBlob.fs.readFile(itemPath, 'utf8'),
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/octet-stream',
            },
          }
        );
      }}
      setFolderId(null);
    } catch (error) {
      console.error(`Erreur lors du téléversement du dossier ${folderPath} :`, error);
    }
  };

  const fetchDriveFiles = async () => {
    try {
      setModalVisible(true);
      setIsLoading(true);
      const folderUri = await AsyncStorage.getItem('defaultFolderUri');
      const folderPath = folderUri || `${FileSystem.documentDirectory}OmniCapture/`;      
      const isSignedIn = await AsyncStorage.getItem('token');
      let token;
      await GoogleSignin.hasPlayServices();
  
      if (!isSignedIn) {
        const userInfo = await GoogleSignin.signIn();
        token = (await GoogleSignin.getTokens()).accessToken;
      } else {
        token = (await GoogleSignin.getTokens()).accessToken;
      }
  
      await AsyncStorage.setItem('token', token);
      setAccessToken(token);
      const folderId = await checkOrCreateFolder(token);
      console.log('Folder ID:', folderId);
  
      if (folderId) {
        await uploadFolderToDrive(folderPath, folderId);
        setFolderId(null);
        setIsLoading(false);
        setModalVisible(false);
        Alert.alert("Success", "The files have been uploaded to Google Drive.");
      } else {
        setIsLoading(false);
        Alert.alert("OmniCapture folder created", "Tap again to upload your files");
        setModalVisible(false);
      }
  
    } catch (error) {
      setIsLoading(false);
      console.error('Erreur de téléchargement :', error);
    }
  };
 
  const GoToHome = () => {
    navigation.dispatch(StackActions.replace('Accueil'));
  };

  const GoToSetting = () => {
    navigation.dispatch(StackActions.replace('SettingsPage'));
  };

  const integrations = ['Google Drive', 'Notion', 'Zapier', 'Make', 'Todoist'];

  return (
    <SafeAreaView style={styles.safeContainer}>
      {isLoading ? (
        <LottieView
        source={require('../../../assets/coco.json')} 
        autoPlay
        loop
        style={styles.spectre}
      />
      ):(
       <>
       
<View style={styles.topNav}>
  <TouchableOpacity onPress={GoToHome}>
    <Ionicons name="home-outline" size={32} color="#fff" style={styles.topNavIcon} />
  </TouchableOpacity>
  <TouchableOpacity onPress={GoToSetting}>
    <Ionicons name="settings-outline" size={32} color="#fff" style={styles.topNavIcon} />
  </TouchableOpacity>
</View>
<View style={styles.container}>
  <Text style={styles.title}>Integrations</Text>
  <View style={styles.list}>
    {integrations.map((integration, index) => (
      <TouchableOpacity
        key={index}
        style={styles.listItem}
        onPress={integration === 'Google Drive' ? () => setModalVisible(true) : null}
      >
        <Text style={styles.itemText}>{integration}</Text>
        <Ionicons name="chevron-forward-outline" size={20} color="#fff" />
      </TouchableOpacity>
    ))}
  </View>
</View>
<Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Choose an option for Google Drive:</Text>
            <TouchableOpacity
            onPress={() => fetchDriveFiles()}
            style={styles.buttonGreen}
          >
            <Text style={styles.buttonText}>Upload Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setModalVisible(false); setModalVisiblee(true); }}
            style={styles.buttonRed}
          >
            <Text style={styles.buttonText}>Choose Folder</Text>
          </TouchableOpacity>
          </View>
        </View>
      </Modal>
<Modal
  visible={modalVisiblee}
  animationType="slide"
  onRequestClose={() => setModalVisiblee(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
    <Text style={styles.modalText}>Enter a name for the folder:</Text>
    <TextInput
        style={styles.input}
        value={folderName}
        onChangeText={setFolderName}
        placeholder="Nom du dossier"
        placeholderTextColor="#ccc"
      />
      <View style={styles.modalButtonsContainer}>
            <TouchableOpacity
              onPress={() => { setModalVisiblee(false); fetchDriveFiles(); }}
              style={styles.buttonGreen1}
            >
              <Text style={styles.buttonText}>Confirm</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisiblee(false)}
              style={styles.buttonRed1}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
    </View>
  </View>
</Modal>
       </> 
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#000', 
  },
  buttonGreen1: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '40%',
    elevation: 3, 
  },
  
  buttonRed1: {
    backgroundColor: '#FF6347',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '40%',
    elevation: 3,
  },
  buttonGreen: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    elevation: 3,
  },
  
  buttonRed: {
    backgroundColor: '#FF6347',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%',
    elevation: 3,
  },
  modalOverlay: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 1)', 
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    padding: 20, 
    borderRadius: 10, 
    width: '80%',
    alignItems: 'center',
    borderWidth: 0, 
    borderColor: 'transparent', 
  },
  modalText: {
    fontSize: 18,
    color: '#ffffff',
    lineHeight: 26,
    marginBottom: 20,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20, 
  },
  input: {
    width: '100%',
    height: 45,
    backgroundColor: '#333',
    color: '#fff',
    paddingLeft: 10,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  modalTextContainer: {
    borderRadius: 12, 
    width: '100%',
  },
  modalImage: {
    width: 300, 
    height: 300,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  topNavIcon: {
    padding: 10,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
    marginTop: 10,
  },
  list: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    paddingVertical: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2c2c2e', 
  },
  itemText: {
    color: '#fff',
    fontSize: 18,
  },
  button: {
    backgroundColor: '#4285F4',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
    alignSelf: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  spectre: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default IntegrationsPage;
