import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert, ActivityIndicator, Dimensions, StatusBar, Platform, SafeAreaView, Animated, Easing } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './FirebaseConfig';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; 

const normalize = (size) => {
  return Math.round(scale * size);
};


export const lightTheme = global.lightTheme || {
  background: '#FFFFFF',
  text: '#000000',
  subText: '#A0A0A0',
  primary: '#6FCF97',
  primaryDark: '#5BB585',
  secondary: '#4A90E2',
  card: '#FFFFFF',
  border: '#E0E0E0',
  tab: '#F0F0F0',
  categoryIcon: '#E8F5E9',
  progressBackground: '#E0E0E0',
  tabBackground: '#F8FCFA',
  inactive: '#A0A0A0',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

export const darkTheme = global.darkTheme || {
  background: '#121212',
  text: '#FFFFFF',
  subText: '#B0B0B0',
  primary: '#6FCF97',
  primaryDark: '#5BB585',
  secondary: '#4A90E2',
  card: '#1E1E1E',
  border: '#333333',
  tab: '#252525',
  categoryIcon: '#2A4030',
  progressBackground: '#333333',
  tabBackground: '#1A1A1A',
  inactive: '#666666',
  shadow: 'rgba(0, 0, 0, 0.3)',
};

const categories = [
  { id: 1, name: 'Food', icon: 'restaurant-outline' },
  { id: 2, name: 'Transport', icon: 'bus-outline' },
  { id: 3, name: 'Medicine', icon: 'medical-outline' },
  { id: 4, name: 'Groceries', icon: 'cart-outline' },
  { id: 5, name: 'Rent', icon: 'home-outline' },  
  { id: 6, name: 'Gifts', icon: 'gift-outline' },
  { id: 7, name: 'Savings', icon: 'wallet-outline' },
  { id: 8, name: 'Entertainment', icon: 'game-controller-outline' },
  { id: 9, name: 'Shopping', icon: 'bag-handle-outline' },
  { id: 10, name: 'Education', icon: 'school-outline' },
  { id: 11, name: 'Bills', icon: 'receipt-outline' },
  { id: 12, name: 'Travel', icon: 'airplane-outline' },
  { id: 13, name: 'Fitness', icon: 'barbell-outline' },
  { id: 14, name: 'More', icon: 'add-outline' },
];

const Category = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  });

  // Theme state
  const [isDarkMode, setIsDarkMode] = React.useState(global.isDarkMode || false);
  const [theme, setTheme] = React.useState(global.theme || lightTheme);

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

  const [totalBalance, setTotalBalance] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [isExpenseModalVisible, setExpenseModalVisible] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [expenseAmount, setExpenseAmount] = React.useState('');
  const [expenseTitle, setExpenseTitle] = React.useState('');
  const [expenseMessage, setExpenseMessage] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [animatedIcons, setAnimatedIcons] = React.useState({});

  // Create animation values for each category
  React.useEffect(() => {
    const animations = {};
    categories.forEach(category => {
      animations[category.id] = {
        scale: new Animated.Value(1),
        rotate: new Animated.Value(0),
        translateY: new Animated.Value(0)
      };
    });
    setAnimatedIcons(animations);
    

    const entranceAnimations = categories.map((category, index) => {
      return Animated.sequence([
        Animated.delay(index * 70), // Stagger the entrance
        Animated.spring(animations[category.id].scale, {
          toValue: 1.1,
          useNativeDriver: true,
          friction: 7,
          tension: 40
        }),
        Animated.spring(animations[category.id].scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 7,
          tension: 40
        })
      ]);
    });

    Animated.parallel(entranceAnimations).start();

   
    categories.forEach(category => {
      startFloatingAnimation(animations[category.id].translateY);
    });
    
    // Start subtle rotate animation for certain icons
    const rotatingCategories = [1, 3, 6, 8, 12]; // Food, Medicine, Gifts, Entertainment, Travel
    rotatingCategories.forEach(categoryId => {
      startRotateAnimation(animations[categoryId].rotate);
    });
  }, []);

  const startFloatingAnimation = (animValue) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: -5,
          duration: 1500 + Math.random() * 1000, 
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 1500 + Math.random() * 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const startRotateAnimation = (animValue) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(animValue, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  };

  // Animation for when an icon is pressed
  const animatePress = (categoryId) => {
    Animated.sequence([
      Animated.timing(animatedIcons[categoryId].scale, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(2))
      }),
      Animated.timing(animatedIcons[categoryId].scale, {
        toValue: 1.2,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(2))
      }),
      Animated.timing(animatedIcons[categoryId].scale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  React.useEffect(() => {
    fetchBalance();           
    fetchTotalExpenses();
  }, []);

  const fetchBalance = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const balanceRef = doc(db, 'balances', userId);
      const balanceDoc = await getDoc(balanceRef);

      if (balanceDoc.exists()) {
        setTotalBalance(balanceDoc.data().amount || 0);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setLoading(false);
    }
  };

  const fetchTotalExpenses = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const expensesRef = collection(db, 'users', userId, 'expenses');
      const querySnapshot = await getDocs(expensesRef);
      
      let total = 0;
      querySnapshot.forEach((doc) => {
        total += doc.data().amount;
      });
      
      setTotalExpenses(total);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const handleCategoryPress = (category) => {
    animatePress(category.id);
    
    if (totalBalance <= 0) {
      Alert.alert(
        'No Balance',
        'You cannot add expenses without any balance. Please add income first.',
        [{ text: 'OK' }]
      );
      return;
    }
    setSelectedCategory(category);
    setExpenseModalVisible(true);
  };

  const handleAddExpense = async () => {
    try {
      const amount = parseFloat(expenseAmount);
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      if (!expenseTitle.trim()) {
        Alert.alert('Error', 'Please enter an expense title');
        return;
      }

      if (amount > totalBalance) {
        Alert.alert('Insufficient Balance', 'Your expense amount exceeds your available balance');
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const expenseData = {
        amount,
        title: expenseTitle,
        category: selectedCategory.name,
        message: expenseMessage,
        date: selectedDate,
        createdAt: new Date(),
      };

      await addDoc(collection(db, 'users', userId, 'expenses'), expenseData);

      const balanceRef = doc(db, 'balances', userId);
      const newBalance = totalBalance - amount;
      await updateDoc(balanceRef, { amount: newBalance });

      setTotalBalance(newBalance);
      setTotalExpenses((prev) => prev + amount);

      setExpenseModalVisible(false);
      setExpenseAmount('');
      setExpenseTitle('');
      setExpenseMessage('');
      setSelectedCategory(null);

      Alert.alert('Success', 'Expense added successfully');
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Error', 'Failed to add expense');
    }
  };

  // Add skeleton animation
  const shimmerAnimValue = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    if (loading) {
      // Start the shimmer animation loop when loading
      Animated.loop(
        Animated.timing(shimmerAnimValue, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [loading]);

  // Generate shimmer gradient for skeleton elements
  const getShimmerGradient = () => {
    const translateX = shimmerAnimValue.interpolate({
      inputRange: [0, 1],
      outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
    });
    
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDarkMode ? '#333333' : '#EEEEEE',
      overflow: 'hidden',
      transform: [{ translateX }],
      opacity: isDarkMode ? 0.3 : 0.6,
    };
  };

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.primary }]}>
        <StatusBar backgroundColor={theme.primary} barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Fixed Green Header Boundary */}
          <View style={[styles.fixedHeader, { backgroundColor: theme.primary }]}></View>

          {/* Skeleton Content */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header Skeleton */}
            <View style={styles.header}>
              <View style={[styles.skeletonScreenTitle, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
            </View>

            {/* Balance Card Skeleton */}
            <View style={[styles.skeletonBalanceCard, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
              <Animated.View style={getShimmerGradient()} />
            </View>

            {/* Categories Grid Skeleton */}
            <View style={styles.categoriesGrid}>
              {Array(14).fill(0).map((_, index) => (
                <View key={index} style={styles.categoryItem}>
                  <View style={[styles.skeletonCategoryIcon, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                    <Animated.View style={getShimmerGradient()} />
                  </View>
                  <View style={[styles.skeletonCategoryName, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                    <Animated.View style={getShimmerGradient()} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.primary }]}>
      <StatusBar backgroundColor={theme.primary} barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Fixed Green Header Boundary */}
        <View style={[styles.fixedHeader, { backgroundColor: theme.primary }]}></View>

        {/* Content Below Header */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Categories</Text>
          </View>

          <View style={[styles.balanceCard, { backgroundColor: theme.primary }]}>
            <View style={styles.mainBalance}>
              <Text style={styles.balanceTitle}>Total Balance</Text>
              <Text style={styles.balanceAmount}>₱{totalBalance.toFixed(2)}</Text>
            </View>

            <View style={styles.expensesRow}>
              <View style={styles.expenseItem}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={styles.expenseAmount}>₱{totalBalance.toFixed(2)}</Text>
              </View>
              <View style={styles.expenseItem}>
                <Text style={styles.balanceLabel}>Total Expenses</Text>
                <Text style={[styles.expenseAmount, styles.redText]}>-₱{totalExpenses.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: totalBalance > 0 ? `${Math.min((totalExpenses / (totalBalance + totalExpenses)) * 100, 100)}%` : '0%' },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {totalBalance > 0 ? 
                  `${Math.min(((totalExpenses / (totalBalance + totalExpenses)) * 100), 100).toFixed(0)}%` : 
                  '0%'} of your expenses
              </Text>
            </View>
          </View>

          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.7}
              >
                {animatedIcons[category.id] && (
                  <Animated.View
                    style={[
                      styles.categoryIcon,
                      category.name === 'More' && styles.moreIcon,
                      {
                        backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                        borderColor: theme.border,
                        transform: [
                          { scale: animatedIcons[category.id].scale },
                          { translateY: animatedIcons[category.id].translateY },
                          { 
                            rotate: animatedIcons[category.id].rotate.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg']
                            })
                          }
                        ]
                      }
                    ]}
                  >
                    <Ionicons 
                      name={category.icon} 
                      size={normalize(24)} 
                      color={theme.primary} 
                    />
                  </Animated.View>
                )}
                <Text style={[styles.categoryName, { color: theme.text }]}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Modal visible={isExpenseModalVisible} transparent={false} animationType="slide">
          <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: theme.primary }]}>
            <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
              <View style={[styles.modalHeader, { backgroundColor: theme.primary }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => setExpenseModalVisible(false)}>
                  <Ionicons name="arrow-back" size={normalize(24)} color={isDarkMode ? "#FFFFFF" : "#000000"} />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Add Expenses</Text>
                <View style={{ width: normalize(40) }} />
              </View>

              <ScrollView style={styles.modalContent}>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Date</Text>
                  <Text style={[styles.dateText, { 
                    color: theme.text,
                    backgroundColor: isDarkMode ? theme.card : '#F5F5F5' 
                  }]}>
                    {selectedDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Category</Text>
                  <Text style={[styles.categoryText, { 
                    color: theme.text,
                    backgroundColor: isDarkMode ? theme.card : '#F5F5F5' 
                  }]}>{selectedCategory?.name || 'Select the category'}</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Amount</Text>
                  <TextInput
                    style={[styles.input, { 
                      color: theme.text,
                      backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                      borderColor: theme.border 
                    }]}
                    placeholder="₱0.00"
                    placeholderTextColor={isDarkMode ? theme.subText : '#A0A0A0'}
                    keyboardType="numeric"
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Expense Title</Text>
                  <TextInput
                    style={[styles.input, { 
                      color: theme.text,
                      backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                      borderColor: theme.border 
                    }]}
                    placeholder="Enter title"
                    placeholderTextColor={isDarkMode ? theme.subText : '#A0A0A0'}
                    value={expenseTitle}
                    onChangeText={setExpenseTitle}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Message (Optional)</Text>
                  <TextInput
                    style={[
                      styles.input, 
                      styles.messageInput, 
                      { 
                        color: theme.text,
                        backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                        borderColor: theme.border 
                      }
                    ]}
                    placeholder="Enter message"
                    placeholderTextColor={isDarkMode ? theme.subText : '#A0A0A0'}
                    value={expenseMessage}
                    onChangeText={setExpenseMessage}
                    multiline
                  />
                </View>

                <TouchableOpacity style={styles.saveButton} onPress={handleAddExpense}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </SafeAreaView>
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
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#6FCF97',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  scrollContent: {
    padding: normalize(20),
    paddingBottom: normalize(100),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(20),
    marginTop: normalize(10),
  },
  backButton: {
    marginRight: normalize(10),
  },
  screenTitle: {
    fontSize: normalize(24),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
  },
  balanceCard: {
    backgroundColor: '#6FCF97',
    padding: normalize(20),
    borderRadius: normalize(10),
    marginBottom: normalize(30),
  },
  mainBalance: {
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  balanceTitle: {
    fontSize: normalize(14),
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: normalize(24),
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginTop: normalize(5),
  },
  expensesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: normalize(15),
  },
  expenseItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: normalize(12),
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    marginBottom: normalize(4),
  },
  expenseAmount: {
    fontSize: normalize(18),
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  redText: {
    color: '#4A90E2',
  },
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: normalize(15),
    borderRadius: normalize(8),
  },
  progressBar: {
    height: normalize(8),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: normalize(4),
    marginBottom: normalize(8),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(4),
  },
  progressText: {
    fontSize: normalize(12),
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: normalize(10),
    marginBottom: normalize(20),
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: normalize(30),
  },
  categoryIcon: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: normalize(8),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(2) },
    shadowOpacity: 0.1,
    shadowRadius: normalize(3),
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  moreIcon: {
    backgroundColor: '#FFFFFF',
  },
  categoryName: {
    fontSize: normalize(12),
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: normalize(20),
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + normalize(10) : normalize(20),
    backgroundColor: '#6FCF97',
  },
  modalTitle: {
    fontSize: normalize(20),
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: normalize(20),
  },
  formGroup: {
    marginBottom: normalize(20),
  },
  label: {
    fontSize: normalize(14),
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    marginBottom: normalize(8),
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: normalize(8),
    padding: normalize(12),
    fontFamily: 'Poppins-Regular',
    fontSize: normalize(14),
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    height: normalize(100),
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: normalize(14),
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    padding: normalize(12),
    backgroundColor: '#F5F5F5',
    borderRadius: normalize(8),
  },
  categoryText: {
    fontSize: normalize(14),
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    padding: normalize(12),
    backgroundColor: '#F5F5F5',
    borderRadius: normalize(8),
  },
  saveButton: {
    backgroundColor: '#6FCF97',
    padding: normalize(15),
    borderRadius: normalize(8),
    alignItems: 'center',
    marginTop: normalize(20),
    marginBottom: normalize(20),
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: normalize(16),
    fontFamily: 'Poppins-Bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    fontSize: normalize(16),
    fontFamily: 'Poppins-Regular',
    color: '#6FCF97',
    marginTop: normalize(10),
  },
  // Skeleton UI styles
  skeletonScreenTitle: {
    width: normalize(150),
    height: normalize(28),
    borderRadius: normalize(4),
    overflow: 'hidden',
  },
  skeletonBalanceCard: {
    height: normalize(200),
    borderRadius: normalize(10),
    marginBottom: normalize(30),
    overflow: 'hidden',
  },
  skeletonCategoryIcon: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
    marginBottom: normalize(8),
    overflow: 'hidden',
  },
  skeletonCategoryName: {
    width: normalize(60),
    height: normalize(12),
    borderRadius: normalize(4),
    overflow: 'hidden',
  },
});

export default Category;
