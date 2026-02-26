import * as React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar, Dimensions } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375;

const normalize = (size) => {
  return Math.round(scale * size);
};

const OnboardingScreen = ({ navigation }) => {
  const [screenIndex, setScreenIndex] = React.useState(0);

  const screens = [
    {
      title: 'Welcome To Spenzy',
      subtitle: 'your budget Manager',
      image: require('../assets/images/onboard1.png'),
    },
    {
      title: 'Are You Ready To',
      subtitle: 'Take Control Of Your Finances?',
      image: require('../assets/images/onboard2.png'),
    },
    {
      title: '', 
      subtitle: '',
      image: require('../assets/images/onboard1.png'), 
    },
  ];

  const handleNext = () => {
    if (screenIndex < screens.length - 1) {
      setScreenIndex(screenIndex + 1);
    } else {
      navigation.navigate('AuthScreen');
    }
  };

  const handleBack = () => {
    if (screenIndex > 0) {
      setScreenIndex(screenIndex - 1);
    }
  };

  const currentScreen = screens[screenIndex];

  // Load fonts
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6FCF97" barStyle="light-content" />
      {screenIndex > 0 && (
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
          >
            <View style={styles.backButtonContainer}>
              <Ionicons name="chevron-back" size={normalize(28)} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.greenBackground}>
        <Text style={styles.title}>{currentScreen.title}</Text>
        <Text style={styles.subtitle}>{currentScreen.subtitle}</Text>
        {screenIndex === screens.length - 1 && (
          <Text style={styles.topAdditionalText}>
            Get Started Now and Budget Your Money!
          </Text>
        )}
      </View>
      <View style={styles.whiteBackground}>
        <View style={styles.imageContainer}>
          <View style={styles.circleBackground} />
          <Image source={currentScreen.image} style={styles.image} resizeMode="contain" />
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            screenIndex === screens.length - 1 && styles.getStartedButton
          ]}
          onPress={handleNext}
        >
          <Text style={[styles.buttonText, screenIndex === screens.length - 1 && styles.getStartedText]}>
            {screenIndex === screens.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          {screenIndex === screens.length - 1 ? (
            <Ionicons name="arrow-forward" size={normalize(24)} color="#FFFFFF" style={styles.buttonIcon} />
          ) : (
            <Ionicons name="arrow-forward" size={normalize(24)} color="#6FCF97" style={styles.buttonIcon} />
          )}
        </TouchableOpacity>
        {screenIndex < screens.length - 1 && (
          <View style={styles.indicatorContainer}>
            {screens.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  { opacity: index === screenIndex ? 1 : 0.3 },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6FCF97',
  },
  header: {
    position: 'absolute',
    top: normalize(45),
    left: normalize(15),
    zIndex: 1,
  },
  backButton: {
    padding: normalize(8),
  },
  backButtonContainer: {
    width: normalize(40),
    height: normalize(40),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: normalize(20),
    justifyContent: 'center',
    alignItems: 'center',
    bottom: 20,
  },
  greenBackground: {
    flex: 1,
    backgroundColor: '#6FCF97',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  whiteBackground: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    bottom: 5,
  },
  topAdditionalText: {
    fontSize: 22,
    fontFamily: 'Poppins-SemiBold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBackground: {
    position: 'absolute',
    width: 210,
    height: 220,
    borderRadius: 120,
    backgroundColor: '#6FCF97',
    opacity: 0.2,
  },
  image: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: normalize(12),
    paddingHorizontal: normalize(30),
    borderRadius: normalize(30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: normalize(30),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(4) },
    shadowOpacity: 0.2,
    shadowRadius: normalize(5),
    elevation: 4,
    width: normalize(160),
    alignSelf: 'center',
  },
  getStartedButton: {
    backgroundColor: '#6FCF97',
    width: normalize(200),
    paddingVertical: normalize(15),
    shadowColor: '#6FCF97',
    shadowOffset: { width: 0, height: normalize(4) },
    shadowOpacity: 0.3,
    shadowRadius: normalize(8),
    elevation: 6,
  },
  buttonText: {
    color: '#6FCF97',
    fontSize: normalize(18),
    fontFamily: 'Poppins-Bold',
  },
  buttonIcon: {
    marginLeft: normalize(8),
  },
  getStartedText: {
    color: '#FFFFFF',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6FCF97',
    marginHorizontal: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OnboardingScreen;
