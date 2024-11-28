import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, StyleSheet, TouchableOpacity, FlatList, Modal, Alert, KeyboardAvoidingView, ScrollView, Platform, Keyboard } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons'; 
import { useNavigation, StackActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NewMode = ({ route }) => {

  const navigation = useNavigation();
  const [modeName, setModeName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [translateToEnglish, setTranslateToEnglish] = useState(false);
  const [selectedVoiceModel, setSelectedVoiceModel] = useState('Standard (English)');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const { mode, isEdit, updateMode } = route.params || {};

    
    
  const [voiceModel, setVoiceModel] = useState('Standard (English)');
  const [isVoiceModelModalVisible, setIsVoiceModelModalVisible] = useState(false);
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const voiceModels = ['Standard (English)', 'Advanced (English)', 'Premium (English)'];
  const languages = ['English', 'French', 'Spanish'];

  const openVoiceModelModal = () => setIsVoiceModelModalVisible(true);
  const closeVoiceModelModal = () => setIsVoiceModelModalVisible(false);

  const openLanguageModal = () => setIsLanguageModalVisible(true);
  const closeLanguageModal = () => setIsLanguageModalVisible(false);


  useEffect(() => {
    if (isEdit && mode) {
      setModeName(mode.name);
      setPrompt(mode.prompt);
      setVoiceModel(mode.voiceModel);
      setSelectedLanguage(mode.language);
    }
  }, [isEdit, mode]);
  const selectVoiceModel = (model) => {
    setSelectedVoiceModel(model);
    closeVoiceModelModal();
  };

  const selectLanguage = (language) => {
    setSelectedLanguage(language);
    closeLanguageModal();
  };
  const toggleTranslateToEnglish = () => {
    setTranslateToEnglish(previousState => !previousState);
  };
  const onBack = async () => {
    await saveMode(); 
    navigation.dispatch(StackActions.replace('SettingsPage'));
  };
  const saveMode = async () => {
    if (!modeName || !prompt) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    const newMode = {
      name: modeName,
      prompt: prompt,
      voiceModel: voiceModel,
      language: selectedLanguage,
      translateToEnglish: translateToEnglish,
    };
    try {
        if (isEdit) {
          updateMode(newMode);
        } else {
          const storedModes = await AsyncStorage.getItem('modes');
          const modes = storedModes ? JSON.parse(storedModes) : [];
          modes.push(newMode);
          await AsyncStorage.setItem('modes', JSON.stringify(modes));
        }
      } catch (error) {
        console.error('Failed to save mode:', error);
      }

    
  };
  return (
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    keyboardVerticalOffset={0}
  >
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={32} color="#007aff" />
          <Text style={styles.backText}>Settings</Text>
        </TouchableOpacity>
      </View>
        <Text style={styles.headerTitle}></Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NAME</Text>
        <TextInput
    style={styles.input}
    placeholder="Enter mode name"
    placeholderTextColor="#8e8e93"
    value={modeName} 
    onChangeText={setModeName} 
  />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PROMPT</Text>
        <TextInput
    style={styles.promptText}
    value={prompt}
    onChangeText={setPrompt} 
    multiline
  />
      </View>
        <Text style={styles.promptSubtext}>
  Configure a prompt to use on the dictated text. Choose one from the dropdown or create your own.
</Text>

      {/* Voice Model Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>VOICE MODEL</Text>
        <TouchableOpacity style={styles.option} onPress={openVoiceModelModal}>
          <Text style={styles.optionText}>Voice model</Text>
          <Text style={styles.optionDetail}>{selectedVoiceModel}</Text>
        </TouchableOpacity>

      
        <TouchableOpacity style={styles.languageOption} onPress={openLanguageModal}>
          <Text style={styles.optionText}>Language</Text>
          <Text style={styles.optionDetail}>{selectedLanguage}</Text>
          </TouchableOpacity>
      <Modal
        transparent={true}
        visible={isVoiceModelModalVisible}
        animationType="slide"
        onRequestClose={closeVoiceModelModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Voice Model</Text>
            <FlatList
              data={voiceModels}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => selectVoiceModel(item)}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={closeVoiceModelModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent={true}
        visible={isLanguageModalVisible}
        animationType="slide"
        onRequestClose={closeLanguageModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <FlatList
              data={languages}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => selectLanguage(item)}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeButton} onPress={closeLanguageModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

        <View style={styles.translateOption}>
          <Text style={styles.optionText}>Translate to English</Text>
          <Switch
            value={translateToEnglish}
            onValueChange={toggleTranslateToEnglish}
            trackColor={{ false: "#767577", true: "#34C759" }}
            thumbColor={translateToEnglish ? "#ffffff" : "#f4f3f4"}
          />
        </View>
      </View>
      
     
    </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  promptSubtext: {
    color: '#8e8e93',
    fontSize: 14,
    marginBottom: 20,
    width:'80%',
    paddingLeft: 10
  },
  headerTitle:{
    paddingBottom:80
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
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
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    marginVertical: 10,

  },
  
  sectionTitle: {
    color: '#8e8e93',
    fontSize: 10,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  input: {
    color: '#fff',
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3c',
    paddingVertical: 5,
  },
  promptText: {
    color: '#fff',
    fontSize: 16,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  optionDetail: {
    color: '#8e8e93',
    fontSize: 16,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  translateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
  },
  dangerZone: {
    paddingTop: 30,
  },
  dangerText: {
    color: '#ff3b30',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    marginHorizontal: 20,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8, 
  },
  modalTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  modalItemText: {
    fontSize: 16,
    color: '#fff',
  },
  closeButton: {
    backgroundColor: 'red', 
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#007aff',
    borderRadius: 40,
    padding: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveText: {
    color: 'white',         
    fontSize: 18,            
    fontWeight: 'bold',     
    textAlign: 'center',    
    paddingHorizontal: 6,  
    paddingVertical: 5,     
  },
});

export default NewMode;
