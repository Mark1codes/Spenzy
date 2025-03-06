import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Text, Keyboard } from 'react-native';
import Main from '../BottomTabs/Home';
import Transactions from '../BottomTabs/Transactions'; // Import your Transactions component
import Analysis from '../BottomTabs/Analysis'; // Import your Analysis component
import Category from '../BottomTabs/Category'; // Import your Category component
import Profile from '../BottomTabs/Profile';

const Bottomtabs = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {selectedTab === 0 ? (
        <Main />
      ) : selectedTab === 1 ? (
        <Transactions />
      ) : selectedTab === 2 ? (
        <Analysis />
      ) : selectedTab === 3 ? (
        <Category />
      ) : (
        <Profile />
      )}

      {!keyboardVisible && (
        <View style={styles.bottomView}>
          <TouchableOpacity
            style={[styles.bottomTab, selectedTab === 0 && styles.bottomTabSelected]}
            onPress={() => setSelectedTab(0)}
          >
            <View style={selectedTab === 0 ? styles.selectedCircle : null}>
              <Image
                source={require('../assets/images/main.png')} // Use your main icon
                style={styles.bottomTabImg}
              />
            </View>
            <Text style={[styles.bottomTabLabel, selectedTab === 0 && styles.bottomTabLabelSelected]}>Main</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomTab, selectedTab === 1 && styles.bottomTabSelected]}
            onPress={() => setSelectedTab(1)}
          >
            <View style={selectedTab === 1 ? styles.selectedCircle : null}>
              <Image
                source={require('../assets/images/Transactions.png')} // Use your transactions icon
                style={styles.bottomTabImg}
              />
            </View>
            <Text style={[styles.bottomTabLabel, selectedTab === 1 && styles.bottomTabLabelSelected]}>Transactions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomTab, selectedTab === 2 && styles.bottomTabSelected]}
            onPress={() => setSelectedTab(2)}
          >
            <View style={selectedTab === 2 ? styles.selectedCircle : null}>
              <Image
                source={require('../assets/images/Analysis.png')} // Use your analysis icon
                style={styles.bottomTabImg}
              />
            </View>
            <Text style={[styles.bottomTabLabel, selectedTab === 2 && styles.bottomTabLabelSelected]}>Analysis</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomTab, selectedTab === 3 && styles.bottomTabSelected]}
            onPress={() => setSelectedTab(3)}
          >
            <View style={selectedTab === 3 ? styles.selectedCircle : null}>
              <Image
                source={require('../assets/images/Category.png')} // Use your category icon
                style={styles.bottomTabImg}
              />
            </View>
            <Text style={[styles.bottomTabLabel, selectedTab === 3 && styles.bottomTabLabelSelected]}>Category</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomTab, selectedTab === 4 && styles.bottomTabSelected]}
            onPress={() => setSelectedTab(4)}
          >
            <View style={selectedTab === 4 ? styles.selectedCircle : null}>
              <Image
                source={require('../assets/images/Profile.png')} // Use your profile icon
                style={styles.bottomTabImg}
              />
            </View>
            <Text style={[styles.bottomTabLabel, selectedTab === 4 && styles.bottomTabLabelSelected]}>Profile</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default Bottomtabs;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bottomView: {
    width: '100%',
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#DFF7E2',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  bottomTab: {
    height: '100%',
    width: '20%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomTabSelected: {
    borderTopWidth: 3,
    borderTopColor: '#6FCF97',
    paddingTop: 10,
  },
  selectedCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6FCF97',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomTabImg: {
    width: 24,
    height: 24,
    resizeMode: 'contain', // Ensures the image maintains its aspect ratio
  },
  bottomTabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: 'Yantramanav-Regular',
    color: '#6FCF97',
  },
  bottomTabLabelSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
});
