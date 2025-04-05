import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, TextInput, Image, ScrollView, Dimensions, StatusBar, Platform, SafeAreaView, Modal } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './FirebaseConfig';
import { signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateEmail } from 'firebase/auth';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Use 375 as the base width for scaling

const normalize = (size) => {
  return Math.round(scale * size);
};

const ProfileScreen = ({ isProfileScreen = false }) => {
  const navigation = useNavigation();
  const [newPassword, setNewPassword] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [profileImage, setProfileImage] = React.useState(null);
  const [uploading, setUploading] = React.useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = React.useState(false);
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showPasswordSection, setShowPasswordSection] = React.useState(false);
  const [showEditProfile, setShowEditProfile] = React.useState(false);
  const [showHelpSection, setShowHelpSection] = React.useState(false);
  const [username, setUsername] = React.useState('');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [email, setEmail] = React.useState(auth.currentUser?.email || '');
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  });

  // Theme state
  const [isDarkMode, setIsDarkMode] = React.useState(global.isDarkMode);
  const [theme, setTheme] = React.useState(global.theme);

  // Check for theme changes
  React.useEffect(() => {
    const checkThemeInterval = setInterval(() => {
      if (global.isDarkMode !== isDarkMode) {
        setIsDarkMode(global.isDarkMode);
        setTheme(global.theme);
      }
    }, 300);

    return () => clearInterval(checkThemeInterval);
  }, [isDarkMode]);

  React.useEffect(() => {
    fetchProfileImage();
    fetchUserData();
  }, []);

  const fetchProfileImage = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists() && userDoc.data().profileImage) {
        setProfileImage(userDoc.data().profileImage);
      }
    } catch (error) {
      console.error('Error fetching profile image:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUsername(data.username || '');
        setPhoneNumber(data.phoneNumber || '');
        setEmail(auth.currentUser?.email || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const userId = auth.currentUser?.uid;
      const user = auth.currentUser;

      // Update email in Firebase Auth
      if (email !== user.email) {
        await updateEmail(user, email);
      }

      // Save username, phone number, and email to Firestore
      await setDoc(doc(db, 'users', userId), {
        username,
        phoneNumber,
        email,
      }, { merge: true });

      Alert.alert('Success', 'Profile updated successfully');
      setShowEditProfile(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const initiateLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutModal(false);
      navigation.replace('AuthScreen');
    } catch (error) {
      Alert.alert('Error', error.message);
      setShowLogoutModal(false);
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const handlePasswordUpdate = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Create a credential with the current password
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );

      // Reauthenticate the user
      await reauthenticateWithCredential(user, credential);

      // Update the password
      await updatePassword(user, newPassword);

      Alert.alert('Success', 'Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswordSection(false);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos to update your profile image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfileImage(result.assets[0].uri);
        
        // Here you would typically upload the image to storage
        // For demo purposes, just save the URI to Firestore
        const userId = auth.currentUser?.uid;
        await setDoc(doc(db, 'users', userId), {
          profileImage: result.assets[0].uri,
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'There was an error updating your profile image.');
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#6FCF97" barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.fixedHeader}></View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.headerText, { color: theme.text }]}>Profile</Text>

          <View style={styles.userInfo}>
            <TouchableOpacity onPress={pickImage} style={styles.profileImageContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="person-circle-outline" size={normalize(60)} color="#6FCF97" />
                </View>
              )}
              <View style={styles.editIconContainer}>
                <Ionicons name="camera" size={normalize(16)} color="#fff" />
              </View>
            </TouchableOpacity>
            {username ? (
              <Text style={[styles.usernameText, { color: theme.text }]}>{username}</Text>
            ) : (
              <Text style={[styles.usernameText, { color: theme.text }]}>{auth.currentUser?.email}</Text>
            )}
          </View>

          <View style={styles.optionsContainer}>
            {/* Edit Profile Option */}
            <TouchableOpacity
              style={[styles.optionButton, showEditProfile && styles.activeOptionButton, { backgroundColor: theme.card }]}
              onPress={() => setShowEditProfile(!showEditProfile)}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="person-outline" size={normalize(20)} color="#FFFFFF" />
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>Edit Profile</Text>
              <Ionicons 
                name={showEditProfile ? "chevron-up-outline" : "chevron-down-outline"} 
                size={normalize(20)} 
                color="#6FCF97" 
                style={styles.arrowIcon}
              />
            </TouchableOpacity>

            {showEditProfile && (
              <View style={[styles.editProfileContainer, { backgroundColor: theme.card }]}>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDarkMode ? theme.background : '#F5F5F5' }]}
                  placeholder="Username"
                  value={username}
                  onChangeText={setUsername}
                  placeholderTextColor={theme.subText}
                />
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDarkMode ? theme.background : '#F5F5F5' }]}
                  placeholder="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  placeholderTextColor={theme.subText}
                />
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDarkMode ? theme.background : '#F5F5F5' }]}
                  placeholder="Email Address"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholderTextColor={theme.subText}
                />
                <TouchableOpacity style={styles.button} onPress={handleSaveProfile}>
                  <Ionicons name="save-outline" size={normalize(20)} color="#fff" />
                  <Text style={styles.buttonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Security (Change Password) Option */}
            <TouchableOpacity
              style={[styles.optionButton, showPasswordSection && styles.activeOptionButton, { backgroundColor: theme.card }]}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="shield-checkmark-outline" size={normalize(20)} color="#FFFFFF" />
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>Security</Text>
              <Ionicons 
                name={showPasswordSection ? "chevron-up-outline" : "chevron-down-outline"} 
                size={normalize(20)} 
                color="#6FCF97" 
                style={styles.arrowIcon}
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={[styles.editProfileContainer, { backgroundColor: theme.card }]}>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDarkMode ? theme.background : '#F5F5F5' }]}
                    placeholder="Current Password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry={!showCurrentPassword}
                    placeholderTextColor={theme.subText}
                  />
                  <TouchableOpacity 
                    style={styles.passwordVisibilityToggle}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    <Ionicons name={showCurrentPassword ? "eye-off-outline" : "eye-outline"} size={normalize(20)} color={theme.subText} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: isDarkMode ? theme.background : '#F5F5F5' }]}
                    placeholder="New Password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    placeholderTextColor={theme.subText}
                  />
                  <TouchableOpacity 
                    style={styles.passwordVisibilityToggle}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Ionicons name={showNewPassword ? "eye-off-outline" : "eye-outline"} size={normalize(20)} color={theme.subText} />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity style={styles.button} onPress={handlePasswordUpdate}>
                  <Ionicons name="lock-closed-outline" size={normalize(20)} color="#fff" />
                  <Text style={styles.buttonText}>Update Password</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Help & Support Option */}
            <TouchableOpacity
              style={[styles.optionButton, showHelpSection && styles.activeOptionButton, { backgroundColor: theme.card }]}
              onPress={() => setShowHelpSection(!showHelpSection)}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="help-circle-outline" size={normalize(20)} color="#FFFFFF" />
              </View>
              <Text style={[styles.optionText, { color: theme.text }]}>Help & Support</Text>
              <Ionicons 
                name={showHelpSection ? "chevron-up-outline" : "chevron-down-outline"} 
                size={normalize(20)} 
                color="#6FCF97" 
                style={styles.arrowIcon}
              />
            </TouchableOpacity>

            {showHelpSection && (
              <View style={[styles.editProfileContainer, { backgroundColor: theme.card }]}>
                <TouchableOpacity style={styles.helpOption}>
                  <Ionicons name="document-text-outline" size={normalize(20)} color="#6FCF97" />
                  <Text style={[styles.helpOptionText, { color: theme.text }]}>FAQs</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.helpOption}>
                  <Ionicons name="mail-outline" size={normalize(20)} color="#6FCF97" />
                  <Text style={[styles.helpOptionText, { color: theme.text }]}>Contact Support</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.helpOption}>
                  <Ionicons name="information-circle-outline" size={normalize(20)} color="#6FCF97" />
                  <Text style={[styles.helpOptionText, { color: theme.text }]}>About App</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Logout Button */}
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: theme.card }]} onPress={initiateLogout}>
              <View style={[styles.optionIconContainer, styles.logoutIconContainer]}>
                <Ionicons name="log-out-outline" size={normalize(20)} color="#FFFFFF" />
              </View>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Logout Confirmation Modal */}
        <Modal
          visible={showLogoutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelLogout}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Confirm Logout</Text>
              <Text style={[styles.modalMessage, { color: theme.subText }]}>Are you sure you want to logout?</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton]} 
                  onPress={cancelLogout}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.confirmButton]} 
                  onPress={confirmLogout}
                >
                  <Text style={styles.modalButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6FCF97',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  fixedHeader: {
    height: Platform.OS === 'ios' ? normalize(90) : StatusBar.currentHeight + normalize(5),
    backgroundColor: '#6FCF97',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(2) },
    shadowOpacity: 0.25,
    shadowRadius: normalize(4),
    borderBottomLeftRadius: normalize(10),
    borderBottomRightRadius: normalize(10),
  },
  content: {
    padding: normalize(20),
    paddingBottom: normalize(100),
  },
  headerText: {
    fontFamily: 'Poppins-Bold',
    fontSize: normalize(24),
    color: '#333',
    marginBottom: normalize(20),
    marginTop: normalize(10),
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: normalize(30),
  },
  usernameText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: normalize(18),
    color: '#333',
    marginTop: normalize(10),
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: normalize(5),
  },
  profileImage: {
    width: normalize(100),
    height: normalize(100),
    borderRadius: normalize(50),
    borderWidth: 3,
    borderColor: '#6FCF97',
  },
  placeholderImage: {
    width: normalize(100),
    height: normalize(100),
    borderRadius: normalize(50),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6FCF97',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6FCF97',
    padding: normalize(6),
    borderRadius: normalize(15),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(2) },
    shadowOpacity: 0.2,
    shadowRadius: normalize(3),
  },
  optionsContainer: {
    width: '100%',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: normalize(15),
    backgroundColor: '#fff',
    borderRadius: normalize(12),
    marginBottom: normalize(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(1) },
    shadowOpacity: 0.1,
    shadowRadius: normalize(2),
  },
  activeOptionButton: {
    borderLeftWidth: normalize(3),
    borderLeftColor: '#6FCF97',
  },
  arrowIcon: {
    position: 'absolute',
    right: normalize(15),
  },
  optionIconContainer: {
    backgroundColor: '#6FCF97',
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: normalize(15),
  },
  logoutIconContainer: {
    backgroundColor: '#FF6B6B',
  },
  optionText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: normalize(16),
    color: '#333',
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: normalize(15),
    backgroundColor: '#fff',
    borderRadius: normalize(12),
    marginTop: normalize(10),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(1) },
    shadowOpacity: 0.1,
    shadowRadius: normalize(2),
  },
  logoutText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: normalize(16),
    color: '#FF6B6B',
  },
  editProfileContainer: {
    width: '100%',
    padding: normalize(15),
    backgroundColor: '#fff',
    borderRadius: normalize(12),
    marginBottom: normalize(12),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(1) },
    shadowOpacity: 0.1,
    shadowRadius: normalize(2),
  },
  input: {
    width: '100%',
    height: normalize(50),
    backgroundColor: '#F5F5F5',
    borderRadius: normalize(8),
    paddingHorizontal: normalize(15),
    marginBottom: normalize(15),
    fontFamily: 'Poppins-Regular',
    fontSize: normalize(14),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6FCF97',
    borderRadius: normalize(8),
    height: normalize(50),
    marginTop: normalize(10),
  },
  buttonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: normalize(16),
    color: '#fff',
    marginLeft: normalize(10),
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: normalize(15),
  },
  passwordVisibilityToggle: {
    position: 'absolute',
    right: normalize(15),
    top: normalize(15),
    zIndex: 1,
  },
  helpOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: normalize(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  helpOptionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: normalize(14),
    color: '#333',
    marginLeft: normalize(10),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: normalize(12),
    padding: normalize(20),
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(2) },
    shadowOpacity: 0.25,
    shadowRadius: normalize(4),
  },
  modalTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: normalize(18),
    color: '#333',
    marginBottom: normalize(10),
  },
  modalMessage: {
    fontFamily: 'Poppins-Regular',
    fontSize: normalize(14),
    color: '#666',
    marginBottom: normalize(20),
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: normalize(45),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: normalize(8),
    marginHorizontal: normalize(5),
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  confirmButton: {
    backgroundColor: '#FF6B6B',
  },
  modalButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: normalize(14),
    color: '#fff',
  },
});

export default ProfileScreen;