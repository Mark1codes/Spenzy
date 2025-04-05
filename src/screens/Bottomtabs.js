import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text, Keyboard, BackHandler, Alert, Dimensions, Animated, Easing } from 'react-native';
import { useFonts } from 'expo-font';
import Main from '../BottomTabs/Home';
import Budget from '../BottomTabs/Budget';
import Transactions from '../BottomTabs/Transactions';
import Analysis from '../BottomTabs/Analysis';
import Category from '../BottomTabs/Category';
import Profile from '../BottomTabs/Profile';

// Get screen dimensions for responsive sizing
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Base width for scaling

const normalize = (size) => {
  return Math.round(scale * size);
};

const Bottomtabs = () => {
  // Use global theme state
  const [isDarkMode, setIsDarkMode] = useState(global.isDarkMode);
  const [theme, setTheme] = useState(global.theme);
  const [selectedTab, setSelectedTab] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Animation values for floating center button
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Load fonts at the top level
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  });

  // Check for theme changes
  useEffect(() => {
    const checkThemeInterval = setInterval(() => {
      if (global.isDarkMode !== isDarkMode) {
        setIsDarkMode(global.isDarkMode);
        setTheme(global.theme);
      }
    }, 300);

    return () => clearInterval(checkThemeInterval);
  }, [isDarkMode]);

  useEffect(() => {
    // Start floating animation for center button
    Animated.loop(
      Animated.sequence([
        // Float up
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        // Float down
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();

    // Start pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();

    // Start subtle shake animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 400,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.delay(2000) // Pause between shakes
      ])
    ).start();

    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    const backAction = () => {
      Alert.alert(
        "Exit App",
        "Are you sure you want to exit?",
        [
          {
            text: "Cancel",
            onPress: () => null,
            style: "cancel"
          },
          { 
            text: "Yes", 
            onPress: () => BackHandler.exitApp() 
          }
        ]
      );
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
      backHandler.remove();
    };
  }, []);

  // Render nothing until fonts are loaded
  if (!fontsLoaded) {
    return null; // Or you could return a loading indicator here
  }

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-5deg', '5deg']
  });

  // Reordered tab rendering based on the new layout
  const renderTabContent = () => {
    switch (selectedTab) {
      case 0: return <Main />;
      case 1: return <Budget />;
      case 2: return <Transactions />;
      case 3: return <Category />;
      case 4: return <Analysis />;
      case 5: return <Profile isProfileScreen={true} />;
      default: return <Main />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Profile Icon in Top Right - Visible only on Main screen */}
      {selectedTab === 0 && (
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => setSelectedTab(5)}
        >
          <View style={styles.profileCircle}>
            <Image
              source={require('../assets/images/Profile.png')}
              style={[styles.profileImg, { tintColor: theme.dark ? '#FFFFFF' : undefined }]}
            />
          </View>
          <Text style={[styles.profileLabel, { color: theme.primary }]}>Me</Text>
        </TouchableOpacity>
      )}

      {/* Main Content */}
      {renderTabContent()}

      {/* Bottom Navigation */}
      {!keyboardVisible && (
        <View style={[styles.bottomView, { backgroundColor: theme.tabBackground }]}>
          {/* Home Tab */}
          <TouchableOpacity
            style={styles.bottomTab}
            onPress={() => setSelectedTab(0)}
            activeOpacity={0.7}
          >
            <Animated.View style={[
              styles.iconContainer,
              selectedTab === 0 && styles.activeIconContainer,
              {
                transform: selectedTab === 0 ? [
                  { scale: scaleAnim.interpolate({
                    inputRange: [1, 1.1],
                    outputRange: [1, 1.05]
                  }) }
                ] : []
              }
            ]}>
              <Image
                source={require('../assets/images/main4.png')}
                style={[
                  styles.bottomTabImg, 
                  { tintColor: selectedTab === 0 ? '#FFFFFF' : theme.inactive },
                ]}
              />
            </Animated.View>
            {selectedTab === 0 && <Text style={[styles.bottomTabLabelSelected, { color: theme.primary }]}>Home</Text>}
          </TouchableOpacity>

          {/* Budget Tab */}
          <TouchableOpacity
            style={styles.bottomTab}
            onPress={() => setSelectedTab(1)}
            activeOpacity={0.7}
          >
            <Animated.View style={[
              styles.iconContainer,
              selectedTab === 1 && styles.activeIconContainer,
              {
                transform: selectedTab === 1 ? [
                  { scale: scaleAnim.interpolate({
                    inputRange: [1, 1.1],
                    outputRange: [1, 1.05]
                  }) }
                ] : []
              }
            ]}>
              <Image
                source={require('../assets/images/Budget.png')}
                style={[
                  styles.bottomTabImg, 
                  { tintColor: selectedTab === 1 ? '#FFFFFF' : theme.inactive },
                ]}
              />
            </Animated.View>
            {selectedTab === 1 && <Text style={[styles.bottomTabLabelSelected, { color: theme.primary }]}>Budget</Text>}
          </TouchableOpacity>

          {/* Category Tab - Center Floating Button */}
          <TouchableOpacity
            style={styles.centerTab}
            onPress={() => setSelectedTab(3)}
            activeOpacity={0.7}
          >
            <Animated.View 
              style={[
                styles.floatingContainer,
                {
                  transform: [
                    { translateY: floatAnim },
                    { scale: scaleAnim },
                    { rotate: rotate }
                  ]
                },
                selectedTab === 3 && styles.activeFloatingContainer
              ]}
            >
              <Image
                source={require('../assets/images/Category.png')}
                style={[styles.centerTabImg, selectedTab === 3 && styles.activeIcon]}
              />
            </Animated.View>
            {selectedTab === 3 && <Text style={[styles.centerTabLabel, { color: theme.primary }]}>Category</Text>}
          </TouchableOpacity>

          {/* Transactions Tab */}
          <TouchableOpacity
            style={styles.bottomTab}
            onPress={() => setSelectedTab(2)}
            activeOpacity={0.7}
          >
            <Animated.View style={[
              styles.iconContainer,
              selectedTab === 2 && styles.activeIconContainer,
              {
                transform: selectedTab === 2 ? [
                  { scale: scaleAnim.interpolate({
                    inputRange: [1, 1.1],
                    outputRange: [1, 1.05]
                  }) }
                ] : []
              }
            ]}>
              <Image
                source={require('../assets/images/Transactions.png')}
                style={[
                  styles.bottomTabImg, 
                  { tintColor: selectedTab === 2 ? '#FFFFFF' : theme.inactive },
                ]}
              />
            </Animated.View>
            {selectedTab === 2 && <Text style={[styles.bottomTabLabelSelected, { color: theme.primary }]}>Transactions</Text>}
          </TouchableOpacity>

          {/* Analysis Tab */}
          <TouchableOpacity
            style={styles.bottomTab}
            onPress={() => setSelectedTab(4)}
            activeOpacity={0.7}
          >
            <Animated.View style={[
              styles.iconContainer,
              selectedTab === 4 && styles.activeIconContainer,
              {
                transform: selectedTab === 4 ? [
                  { scale: scaleAnim.interpolate({
                    inputRange: [1, 1.1],
                    outputRange: [1, 1.05]
                  }) }
                ] : []
              }
            ]}>
              <Image
                source={require('../assets/images/Analysis.png')}
                style={[
                  styles.bottomTabImg, 
                  { tintColor: selectedTab === 4 ? '#FFFFFF' : theme.inactive },
                ]}
              />
            </Animated.View>
            {selectedTab === 4 && <Text style={[styles.bottomTabLabelSelected, { color: theme.primary }]}>Analysis</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileButton: {
    position: 'absolute',
    top: normalize(33),
    right: normalize(15),
    zIndex: 1,
    alignItems: 'center',
  },
  profileCircle: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#6FCF97',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  profileImg: {
    width: normalize(24),
    height: normalize(24),
    resizeMode: 'contain',
  },
  profileLabel: {
    fontSize: normalize(10),
    marginTop: normalize(4),
    fontFamily: 'Poppins-SemiBold',
  },
  bottomView: {
    width: '100%',
    height: normalize(70),
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: normalize(25),
    borderTopRightRadius: normalize(25),
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
    paddingHorizontal: normalize(10),
  },
  bottomTab: {
    height: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTab: {
    height: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: normalize(-30), // Push it up from the bar
  },
  iconContainer: {
    width: normalize(48),
    height: normalize(48),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: normalize(24),
  },
  activeIconContainer: {
    backgroundColor: '#6FCF97',
    shadowColor: '#6FCF97',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingContainer: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
    backgroundColor: '#5BB585',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6FCF97',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  activeFloatingContainer: {
    backgroundColor: '#6FCF97',
  },
  bottomTabImg: {
    width: normalize(22),
    height: normalize(22),
    resizeMode: 'contain',
  },
  centerTabImg: {
    width: normalize(30),
    height: normalize(30),
    resizeMode: 'contain',
    tintColor: '#FFFFFF',
  },
  activeIcon: {
    tintColor: '#FFFFFF',
  },
  bottomTabLabelSelected: {
    fontSize: normalize(11),
    marginTop: normalize(4),
    fontFamily: 'Poppins-Medium',
  },
  centerTabLabel: {
    fontSize: normalize(11),
    marginTop: normalize(4),
    fontFamily: 'Poppins-Medium',
  },
});

export default Bottomtabs;