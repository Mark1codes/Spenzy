import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, Modal, Dimensions, Animated } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './FirebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { LineChart, PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Use 375 as the base width for scaling

const normalize = (size) => {
  return Math.round(scale * size);
};

// Define themes
export const lightTheme = {
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

export const darkTheme = {
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

// Global variables for theme state
global.isDarkMode = false;
global.theme = lightTheme;

const HomeScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  });

  const [activeTab, setActiveTab] = React.useState('Daily');
  const [totalBalance, setTotalBalance] = React.useState(0);
  const [totalIncome, setTotalIncome] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [showAccountBalance, setShowAccountBalance] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [transactions, setTransactions] = React.useState([]);
  const [showIncomeModal, setShowIncomeModal] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState('');
  const [sourceIncome, setSourceIncome] = React.useState('');
  const [incomeSourcesData, setIncomeSourcesData] = React.useState({});
  const [firstName, setFirstName] = React.useState('');
  const [typingText, setTypingText] = React.useState('');
  const [typingComplete, setTypingComplete] = React.useState(false);
  const [cursorVisible, setCursorVisible] = React.useState(true);
  const welcomeMessage = "Hi, Welcome Back";
  const [transactionsLoaded, setTransactionsLoaded] = React.useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;
  const shimmerAnim = React.useRef(new Animated.Value(0)).current;

  // Theme state
  const [isDarkMode, setIsDarkMode] = React.useState(global.isDarkMode);
  const [theme, setTheme] = React.useState(global.theme);
  const toggleAnimation = React.useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  // Add a ref to track initial load
  const initialLoadCompleted = React.useRef(false);

  // Load theme preference on mount
  React.useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const themePreference = await AsyncStorage.getItem('themePreference');
        if (themePreference === 'dark') {
          setIsDarkMode(true);
          setTheme(darkTheme);
          global.isDarkMode = true;
          global.theme = darkTheme;
          toggleAnimation.setValue(1);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };
    
    loadThemePreference();
  }, []);

  // Update toggle animation when theme changes
  React.useEffect(() => {
    Animated.timing(toggleAnimation, {
      toValue: isDarkMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isDarkMode]);

  // Toggle theme function
  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    
    const newTheme = newMode ? darkTheme : lightTheme;
    setTheme(newTheme);
    
    // Update global variables for other screens
    global.isDarkMode = newMode;
    global.theme = newTheme;
    
    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('themePreference', newMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Initial data loading (unconditional)
  React.useEffect(() => {
    if (loading) {
      console.log('Initial Home data fetch...');
      
      // Fetch initial data
      Promise.all([
        fetchBalanceAndIncome(),
        fetchTotalExpenses(),
        fetchTransactions(),
        fetchUserName(),
      ])
      .then(() => {
        // Start animations after data is fetched
        setTransactionsLoaded(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          })
        ]).start();
        // Mark initial load as completed
        initialLoadCompleted.current = true;
      })
      .catch((err) => {
        console.error('Initial data fetch failed:', err);
        // Mark initial load as completed even on error
        initialLoadCompleted.current = true;
      });
    }
  }, [loading]);

  // Check for theme changes with more robust handling (unconditional)
  React.useEffect(() => {
    const checkThemeInterval = setInterval(() => {
      try {
        if (global.isDarkMode !== isDarkMode) {
          console.log('Theme change detected in Home');
          setIsDarkMode(global.isDarkMode);
          setTheme(global.theme);
          
          // Force a re-render by updating a state value
          setLoading(prev => {
            setTimeout(() => setLoading(false), 100);
            return true;
          });
        }
      } catch (error) {
        console.error('Error handling theme change:', error);
        // Fall back to light theme if there's an error
        setIsDarkMode(false);
        setTheme(lightTheme);
      }
    }, 300);

    return () => clearInterval(checkThemeInterval);
  }, [isDarkMode]);

  // Also move useFocusEffect outside conditional blocks
  useFocusEffect(
    React.useCallback(() => {
      console.log('Home screen in focus, checking if refresh needed...');
      let isMounted = true;

      const refreshData = async () => {
        // Skip if initial load hasn't completed or is still in progress
        if (!initialLoadCompleted.current) {
          console.log('Skipping focus refresh: initial load in progress');
          return;
        }
        
        // Set loading state first
        if (isMounted) setLoading(true);
        
        try {
          // Reset animations
          fadeAnim.setValue(0);
          slideAnim.setValue(50);
          
          // Fetch all data in parallel
          await Promise.all([
            fetchBalanceAndIncome(),
            fetchTotalExpenses(),
            fetchTransactions(),
            fetchUserName(),
          ]);
          
          // Only update state if component is still mounted
          if (isMounted) {
            setTransactionsLoaded(true);
            setLoading(false);
            
            // Start animations
            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
              })
            ]).start();
          }
        } catch (error) {
          console.error('Error refreshing Home data:', error);
          if (isMounted) {
            setLoading(false);
            // Still show UI even if there was an error
            setTransactionsLoaded(true);
          }
        }
      };

      refreshData();
      
      // Clean up function
      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Typing animation effect with repeat cycle
  React.useEffect(() => {
    const animationCycle = () => {
      // Reset typing state
      setTypingText('');
      setTypingComplete(false);
      
      // Calculate typing speed based on message length to complete in 4 seconds
      const typingDuration = 4000; // 4 seconds for typing
      const pauseDuration = 4000;  // 4 seconds pause with complete text
      const typingInterval = typingDuration / welcomeMessage.length;
      
      // Start typing animation
      let currentIndex = 0;
      const typingTimer = setInterval(() => {
        if (currentIndex < welcomeMessage.length) {
          setTypingText(welcomeMessage.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typingTimer);
          setTypingComplete(true);
          
          // After showing complete text for pauseDuration, restart the cycle
          setTimeout(() => {
            setTypingText('');
            setTypingComplete(false);
            setTimeout(animationCycle, 500); // Small delay before restarting
          }, pauseDuration);
        }
      }, typingInterval);
    };
    
    // Start the initial animation cycle
    animationCycle();
    
    // Clean up any running timers on unmount
    return () => {
      // This cleanup function will be called when the component unmounts
      // All setTimeouts and intervals will be automatically cleared
    };
  }, []);

  // Blinking cursor effect
  React.useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(v => !v);
    }, 500); // Blink every 500ms

    // Clear on unmount
    return () => clearInterval(cursorInterval);
  }, []);

  React.useEffect(() => {
    console.log('Modal visibility changed to:', showIncomeModal);
  }, [showIncomeModal]);

  const fetchUserName = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setFirstName(userData.firstName || '');
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const fetchBalanceAndIncome = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) throw new Error('No authenticated user');
      const balanceRef = doc(db, 'balances', userId);
      const balanceDoc = await getDoc(balanceRef);

      if (balanceDoc.exists()) {
        const data = balanceDoc.data();
        setTotalBalance(data.amount || 0);
        setTotalIncome(data.income || 0);
        setIncomeSourcesData(data.incomeSources || {});
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching balance and income:', error);
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

  const fetchTransactions = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const expensesRef = collection(db, 'users', userId, 'expenses');
      const querySnapshot = await getDocs(expensesRef);

      const transactionsList = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactionsList.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
        });
      });

      transactionsList.sort((a, b) => b.date - a.date);
      setTransactions(transactionsList);
      // Reset animations for when we get new data
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleSourceIncomeUpdate = async () => {
    try {
      const incomeAmount = parseFloat(sourceIncome) || 0;
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const updatedBalance = totalBalance + incomeAmount;
      const updatedIncome = totalIncome + incomeAmount;
      const updatedSources = {
        ...incomeSourcesData,
        [selectedSource]: (incomeSourcesData[selectedSource] || 0) + incomeAmount,
      };

      const balanceRef = doc(db, 'balances', userId);
      await setDoc(balanceRef, {
        amount: updatedBalance,
        income: updatedIncome,
        updatedAt: new Date(),
        incomeSources: updatedSources,
      });

      setTotalBalance(updatedBalance);
      setTotalIncome(updatedIncome);
      setIncomeSourcesData(updatedSources);
      setSourceIncome('');
      setShowIncomeModal(false);
      Alert.alert('Success', `${selectedSource} income added successfully`);
    } catch (error) {
      console.error('Error updating source income:', error);
      Alert.alert('Error', 'Failed to update income');
    }
  };

  const handleOpenModal = (sourceName) => {
    console.log('Opening modal for:', sourceName);
    setSelectedSource(sourceName);
    setShowIncomeModal(true);
  };

  const handleCloseModal = () => {
    setShowIncomeModal(false);
    setSourceIncome('');
  };

  const handleAddIncome = () => {
    handleSourceIncomeUpdate();
  };

  const incomeSources = [
    { name: 'Salary', icon: 'briefcase-outline' },
    { name: 'Business', icon: 'storefront-outline' },
    { name: 'Investments', icon: 'trending-up-outline' },
    { name: 'Freelance', icon: 'laptop-outline' },
    { name: 'Gifts', icon: 'gift-outline' },
    { name: 'Savings', icon: 'wallet-outline' },
    { name: 'Allowance', icon: 'cash-outline' },
    { name: 'Others', icon: 'ellipsis-horizontal-outline' },
  ];

  const filterTransactions = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (activeTab) {
      case 'Daily':
        return transactions.filter((t) => t.date >= startOfDay);
      case 'Weekly':
        return transactions.filter((t) => t.date >= startOfWeek);
      case 'Monthly':
        return transactions.filter((t) => t.date >= startOfMonth);
      default:
        return transactions;
    }
  };

  const getCategoryIcon = (category) => {
    if (category === 'Food') return 'restaurant-outline';
    else if (category === 'Transport') return 'bus-outline';
    else if (category === 'Medicine') return 'medical-outline';
    else if (category === 'Groceries') return 'cart-outline';
    else if (category === 'Rent') return 'home-outline';
    else if (category === 'Gifts') return 'gift-outline';
    else if (category === 'Savings') return 'wallet-outline';
    else if (category === 'Entertainment') return 'game-controller-outline';
    else if (category === 'Shopping') return 'bag-handle-outline';
    else if (category === 'Education') return 'school-outline';
    else if (category === 'Bills') return 'receipt-outline';
    else if (category === 'Travel') return 'airplane-outline';
    else if (category === 'Fitness') return 'barbell-outline';
    else if (category === 'More') return 'add-outline';
    else return 'add-outline';
  };

  const getSpendingTrendsData = () => {
    const monthlyData = {};
    transactions.forEach((t) => {
      const month = t.date.toLocaleString('default', { month: 'short', year: 'numeric' });
      monthlyData[month] = (monthlyData[month] || 0) + t.amount;
    });
    const labels = Object.keys(monthlyData).slice(-6);
    const data = Object.values(monthlyData).slice(-6);
    return {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{ data: data.length ? data : [0] }],
    };
  };

  const getIncomeSourcesPieData = () => {
    const pieData = incomeSources.map((source) => ({
      name: source.name,
      population: incomeSourcesData[source.name] || 0,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      legendFontColor: '#666666',
      legendFontSize: 12,
    })).filter((item) => item.population > 0);
    return pieData.length ? pieData : [{ name: 'No Data', population: 1, color: '#E0E0E0' }];
  };

  const renderTransactions = () => {
    const filteredTransactions = filterTransactions();

    if (filteredTransactions.length === 0) {
      return (
        <Animated.View 
          style={[
            styles.emptyState,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={normalize(32)} color="#6FCF97" />
          </View>
          <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Transactions</Text>
        </Animated.View>
      );
    }

    return (
      <Animated.View 
        style={[
          styles.transactionsContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        {filteredTransactions.map((transaction, index) => (
          <Animated.View 
            key={transaction.id} 
            style={[
              styles.transactionItem,
              { 
                opacity: fadeAnim,
                borderBottomColor: theme.border,
                transform: [{ 
                  translateY: Animated.multiply(
                    slideAnim, 
                    new Animated.Value((index + 1) * 0.3)
                  ) 
                }]
              }
            ]}
          >
            <View style={styles.transactionLeft}>
              <View style={[styles.categoryIcon, { backgroundColor: isDarkMode ? theme.card : '#E8F5E9' }]}>
                <Ionicons
                  name={getCategoryIcon(transaction.category)}
                  size={normalize(24)}
                  color="#6FCF97"
                />
              </View>
              <View style={styles.transactionDetails}>
                <Text style={[styles.transactionTitle, { color: theme.text }]}>{transaction.title}</Text>
                <Text style={[styles.transactionMessage, { color: theme.subText }]}>{transaction.message || 'No message'}</Text>
                <Text style={[styles.transactionDate, { color: theme.subText }]}>
                  {new Date(transaction.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <Text style={[styles.transactionAmount, { color: isDarkMode ? '#4A90E2' : '#4A90E2' }]}>-₱{transaction.amount.toFixed(2)}</Text>
          </Animated.View>
        ))}
      </Animated.View>
    );
  };

  // Add shimmer animation effect
  React.useEffect(() => {
    // Only animate shimmer when loading
    if (loading || !fontsLoaded) {
      const shimmerAnimation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        })
      );
      
      shimmerAnimation.start();
      
      return () => shimmerAnimation.stop();
    }
  }, [loading, fontsLoaded, shimmerAnim]);

  // Add a global shimmer animation for transaction skeletons
  const transactionShimmerAnim = React.useRef(new Animated.Value(0)).current;

  // Add useEffect for transaction shimmer animation
  React.useEffect(() => {
    if (!transactionsLoaded) {
      Animated.loop(
        Animated.timing(transactionShimmerAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        })
      ).start();
      
      return () => transactionShimmerAnim.stopAnimation();
    }
  }, [transactionsLoaded]);

  // Replace the transaction skeleton UI code
  const renderTransactionSkeletons = () => {
    const shimmerColor = transactionShimmerAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [
        isDarkMode ? '#222222' : '#E0E0E0',
        isDarkMode ? '#333333' : '#F5F5F5',
        isDarkMode ? '#222222' : '#E0E0E0'
      ]
    });

    return [...Array(5)].map((_, index) => (
      <View 
        key={index} 
        style={[styles.transactionItem, { borderBottomColor: theme.border }]}
      >
        <View style={styles.transactionLeft}>
          <Animated.View 
            style={[
              styles.categoryIcon, 
              { backgroundColor: shimmerColor }
            ]} 
          />
          <View style={styles.transactionDetails}>
            <Animated.View 
              style={[
                styles.skeletonLine, 
                { 
                  width: '80%', 
                  height: normalize(16),
                  backgroundColor: shimmerColor,
                  marginBottom: normalize(4)
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.skeletonLine, 
                { 
                  width: '90%', 
                  height: normalize(14),
                  backgroundColor: shimmerColor,
                  marginBottom: normalize(4)
                }
              ]} 
            />
            <Animated.View 
              style={[
                styles.skeletonLine, 
                { 
                  width: '50%', 
                  height: normalize(12),
                  backgroundColor: shimmerColor
                }
              ]} 
            />
          </View>
        </View>
        <Animated.View 
          style={[
            styles.skeletonLine, 
            { 
              width: normalize(60), 
              height: normalize(20),
              backgroundColor: shimmerColor
            }
          ]} 
        />
      </View>
    ));
  };

  if (!fontsLoaded || loading) {
    // Create animated background color for shimmer effect
    const shimmerColor = shimmerAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [
        isDarkMode ? '#222222' : '#E0E0E0', 
        isDarkMode ? '#333333' : '#F5F5F5', 
        isDarkMode ? '#222222' : '#E0E0E0'
      ]
    });
    
    // Reusable skeleton line component with animation
    const SkeletonLine = ({ style }) => (
      <Animated.View 
        style={[
          styles.skeletonLine, 
          { backgroundColor: shimmerColor },
          style
        ]} 
      />
    );
    
    // Skeleton UI for loading state
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Skeleton header */}
        <View style={styles.header}>
          <SkeletonLine style={{ width: '80%', height: normalize(30) }} />
          <SkeletonLine style={{ width: '60%', marginTop: normalize(10), height: normalize(20) }} />
          <SkeletonLine style={{ width: '40%', marginTop: normalize(15), height: normalize(20) }} />
        </View>

        {/* Skeleton balance card */}
        <View style={[styles.balanceContainer, { backgroundColor: isDarkMode ? '#2A2A2A' : '#E8E8E8' }]}>
          <View style={styles.balanceItem}>
            <SkeletonLine style={{ width: '80%', height: normalize(16) }} />
            <SkeletonLine style={{ width: '70%', height: normalize(24), marginTop: normalize(8) }} />
          </View>
          <View style={styles.balanceItem}>
            <SkeletonLine style={{ width: '80%', height: normalize(16) }} />
            <SkeletonLine style={{ width: '70%', height: normalize(24), marginTop: normalize(8) }} />
          </View>
        </View>

        {/* Skeleton progress bar */}
        <View style={styles.progressContainer}>
          <SkeletonLine style={{ width: '100%', height: normalize(10), borderRadius: normalize(5) }} />
          <SkeletonLine style={{ width: '60%', marginTop: normalize(5), height: normalize(14) }} />
        </View>

        {/* Skeleton tabs */}
        <View style={styles.tabsContainer}>
          <SkeletonLine style={{ width: '30%', height: normalize(40), borderRadius: normalize(20) }} />
          <SkeletonLine style={{ width: '30%', height: normalize(40), borderRadius: normalize(20) }} />
          <SkeletonLine style={{ width: '30%', height: normalize(40), borderRadius: normalize(20) }} />
        </View>

        {/* Skeleton transactions */}
        <ScrollView style={styles.listContainer}>
          {[...Array(6)].map((_, index) => (
            <View 
              key={index} 
              style={[styles.transactionItem, { borderBottomColor: theme.border }]}
            >
              <View style={styles.transactionLeft}>
                <Animated.View 
                  style={[
                    styles.categoryIcon, 
                    { backgroundColor: shimmerColor }
                  ]} 
                />
                <View style={styles.transactionDetails}>
                  <SkeletonLine style={{ width: '80%', height: normalize(16) }} />
                  <SkeletonLine style={{ width: '90%', marginTop: normalize(5), height: normalize(14) }} />
                  <SkeletonLine style={{ width: '50%', marginTop: normalize(5), height: normalize(12) }} />
                </View>
              </View>
              <SkeletonLine style={{ width: normalize(60), height: normalize(20) }} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (showAccountBalance) {
    return (
      <View style={[styles.balanceScreenContainer, { backgroundColor: theme.background }]}>
        <View style={styles.fixedHeader}></View>
        <ScrollView style={styles.balanceContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowAccountBalance(false)}>
              <Ionicons name="arrow-back" size={normalize(24)} color={theme.text} style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={[styles.greeting, { color: theme.text }]}>Account Balance</Text>
          </View>

          <View style={styles.balanceContainer}>
            <View style={styles.balanceItem}>
              <View style={styles.balanceRow}>
                <View style={styles.iconTextGroup}>
                  <Ionicons name="wallet-outline" size={normalize(20)} color="#FFFFFF" style={styles.balanceIcon} />
                  <View>
                    <Text style={styles.balanceTitle}>Total Balance</Text>
                    <Text style={styles.balanceAmount}>₱{totalBalance.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.balanceItem}>
              <View style={styles.balanceRow}>
                <View style={styles.iconTextGroup}>
                  <Ionicons name="cash-outline" size={normalize(20)} color="#FFFFFF" style={styles.balanceIcon} />
                  <View>
                    <Text style={styles.balanceTitle}>Total Income</Text>
                    <Text style={styles.balanceAmount}>₱{totalIncome.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.incomeSourcesSection}>
            <Text style={[styles.incomeSourcesLabel, { color: theme.text }]}>Source of Income</Text>
            <View style={styles.incomeSourcesContainer}>
              {incomeSources.map((source) => (
                <TouchableOpacity
                  key={source.name}
                  style={styles.sourceIcon}
                  onPress={() => handleOpenModal(source.name)}
                >
                  <Ionicons name={source.icon} size={normalize(24)} color="#6FCF97" />
                  <Text style={[styles.sourceLabel, { color: theme.subText }]}>{source.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chartsContainer}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Spending by Month (Category)</Text>
            <LineChart
              data={getSpendingTrendsData()}
              width={SCREEN_WIDTH - normalize(40)}
              height={normalize(220)}
              chartConfig={{
                backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                backgroundGradientFrom: isDarkMode ? theme.card : '#FFFFFF',
                backgroundGradientTo: isDarkMode ? theme.card : '#FFFFFF',
                decimalPlaces: 2,
                color: (opacity = 1) => `rgba(111, 207, 151, ${opacity})`,
                labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                style: { borderRadius: normalize(16) },
                propsForDots: { r: normalize(6), strokeWidth: normalize(2), stroke: '#6FCF97' },
              }}
              bezier
              style={styles.chart}
            />

            <Text style={[styles.chartTitle, { color: theme.text }]}>Income Sources Breakdown</Text>
            {totalIncome > 0 ? (
              <PieChart
                data={getIncomeSourcesPieData()}
                width={SCREEN_WIDTH - normalize(40)}
                height={normalize(220)}
                chartConfig={{
                  color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                  labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                style={styles.chart}
              />
            ) : (
              <Text style={[styles.noDataText, { color: theme.subText }]}>No income data available</Text>
            )}
          </View>
        </ScrollView>

        <Modal
          visible={showIncomeModal}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { backgroundColor: isDarkMode ? theme.card : '#FFFFFF' }]}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>Add {selectedSource} Income</Text>
              <TextInput
                style={[styles.modalInput, { 
                  color: isDarkMode ? '#FFFFFF' : '#000000',
                  backgroundColor: isDarkMode ? '#333333' : '#FFFFFF',
                  borderColor: theme.border
                }]}
                placeholder={`Enter ${selectedSource} income`}
                placeholderTextColor={isDarkMode ? '#999999' : '#666666'}
                keyboardType="numeric"
                value={sourceIncome}
                onChangeText={setSourceIncome}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={handleCloseModal}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.addButton]}
                  onPress={handleAddIncome}
                >
                  <Text style={styles.buttonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={[styles.greeting, { color: theme.text }]}>
            {typingText}
            {!typingComplete && cursorVisible && <Text style={styles.cursor}>|</Text>}
          </Text>
        </View>
        <View style={styles.greetingRow}>
          <Text style={[styles.subGreeting, { color: theme.subText }]}>{getGreeting()}</Text>
          <Text style={styles.userName}>{firstName}</Text>
        </View>
        
        {/* Theme Toggle Button */}
        <View style={styles.themeToggleContainer}>
          <TouchableOpacity 
            style={styles.themeToggleButton} 
            onPress={toggleTheme}
            activeOpacity={0.8}
          >
            <Animated.View 
              style={[
                styles.themeToggleTrack,
                {
                  backgroundColor: toggleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#E0E0E0', '#5BB585']
                  })
                }
              ]}
            >
              <Animated.View 
                style={[
                  styles.themeToggleThumb,
                  {
                    transform: [
                      {
                        translateX: toggleAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, normalize(20)]
                        })
                      }
                    ],
                    backgroundColor: toggleAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['#FFFFFF', '#121212']
                    })
                  }
                ]}
              >
                <Ionicons 
                  name={isDarkMode ? 'moon' : 'sunny'} 
                  size={normalize(14)} 
                  color={isDarkMode ? '#FFFFFF' : '#FFC107'} 
                />
              </Animated.View>
            </Animated.View>
            <Text style={[styles.themeToggleText, { color: theme.text }]}>
              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.balanceContainer}>
          <View style={styles.balanceRow}>
            <View style={styles.iconTextGroup}>
              <Ionicons name="wallet-outline" size={normalize(20)} color="#FFFFFF" style={styles.balanceIcon} />
              <View>
                <Text style={styles.balanceTitle}>Total Balance</Text>
                <Text style={styles.balanceAmount}>₱{totalBalance.toFixed(2)}</Text>
              </View>
            </View>
          </View>
       
        <View style={styles.balanceItem}>
          <View style={styles.balanceRow}>
            <View style={styles.iconTextGroup}>
              <Ionicons name="card-outline" size={normalize(20)} color="#FFFFFF" style={styles.balanceIcon} />
              <View>
                <Text style={styles.balanceTitle}>Total Expenses</Text>
                <Text style={[styles.balanceAmount, styles.expenseAmount]}>-₱{totalExpenses.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: theme.progressBackground }]}>
          <View
            style={[
              styles.progressFill,
              { width: totalBalance > 0 ? `${Math.min((totalExpenses / totalBalance) * 100, 100)}%` : '0%' },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: theme.subText }]}>
          Spent ₱{totalExpenses.toFixed(2)} of ₱{totalBalance.toFixed(2)}
        </Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: theme.tab }, activeTab === 'Daily' && styles.activeTab]}
          onPress={() => setActiveTab('Daily')}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: theme.text }, 
              activeTab === 'Daily' && styles.activeTabText
            ]}
          >
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: theme.tab }, activeTab === 'Weekly' && styles.activeTab]}
          onPress={() => setActiveTab('Weekly')}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: theme.text }, 
              activeTab === 'Weekly' && styles.activeTabText
            ]}
          >
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: theme.tab }, activeTab === 'Monthly' && styles.activeTab]}
          onPress={() => setActiveTab('Monthly')}
        >
          <Text 
            style={[
              styles.tabText, 
              { color: theme.text }, 
              activeTab === 'Monthly' && styles.activeTabText
            ]}
          >
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {transactionsLoaded ? (
          renderTransactions()
        ) : (
          // Use the new skeleton renderer function
          renderTransactionSkeletons()
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    padding: normalize(20)
  },
  header: { 
    marginBottom: normalize(20)
  },
  greetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: { 
    fontSize: normalize(24), 
    fontFamily: 'Poppins-Bold', 
    color: '#000000', 
    marginTop: normalize(5),
    height: normalize(36), // Fixed height to prevent layout shifts
  },
  greetingRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: normalize(5),
    bottom: 5,
  },
  subGreeting: { 
    fontSize: normalize(16), 
    fontFamily: 'Poppins-Regular', 
    color: '#A0A0A0'
  },
  userName: { 
    fontSize: normalize(16), 
    fontFamily: 'Poppins-SemiBold', 
    color: '#6FCF97', 
    top: normalize(8)
  },
  balanceContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    backgroundColor: '#6FCF97', 
    padding: normalize(20), 
    borderRadius: normalize(10), 
    marginBottom: normalize(20), 
    top: normalize(5)
  },
  balanceItem: { 
    flex: 1, 
    marginHorizontal: normalize(5)
  },
  balanceRow: { 
    flexDirection: 'row', 
    alignItems: 'center'
  },
  iconTextGroup: { 
    flexDirection: 'row', 
    alignItems: 'center'
  },
  balanceIcon: { 
    marginRight: normalize(8), 
    bottom: normalize(20)
  },
  balanceTitle: { 
    fontSize: normalize(14), 
    fontFamily: 'Poppins-Regular', 
    color: '#FFFFFF'
  },
  balanceAmount: { 
    fontSize: normalize(18), 
    fontFamily: 'Poppins-Bold', 
    color: '#FFFFFF', 
    marginTop: normalize(5)
  },
  expenseAmount: { color: '#4A90E2' },
  progressContainer: { marginBottom: normalize(20) },
  progressBar: { 
    height: normalize(10), 
    backgroundColor: '#E0E0E0', 
    borderRadius: normalize(5), 
    marginBottom: normalize(5)
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#6FCF97', 
    borderRadius: normalize(5)
  },
  progressText: { 
    fontSize: normalize(14), 
    fontFamily: 'Poppins-Regular', 
    color: '#A0A0A0'
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  tabsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: normalize(20)
  },
  tab: { 
    backgroundColor: '#F0F0F0', 
    paddingVertical: normalize(10), 
    paddingHorizontal: normalize(20), 
    borderRadius: normalize(20)
  },
  activeTab: { backgroundColor: '#6FCF97' },
  tabText: { 
    fontSize: normalize(14), 
    fontFamily: 'Poppins-Regular', 
    color: '#000000'
  },
  activeTabText: { color: '#FFFFFF' },
  listContainer: { 
    flex: 1, 
    marginBottom: normalize(50)
  },
  emptyState: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: normalize(40)
  },
  emptyIconCircle: { 
    width: normalize(60), 
    height: normalize(60), 
    borderRadius: normalize(30), 
    backgroundColor: '#E8F5E9', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: normalize(16)
  },
  emptyStateTitle: { 
    fontSize: normalize(18), 
    fontFamily: 'Poppins-Bold', 
    color: '#000000', 
    marginBottom: normalize(12)
  },
  transactionsContainer: { 
    paddingTop: normalize(10)
  },
  transactionItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: normalize(15), 
    paddingHorizontal: normalize(10), 
    borderBottomWidth: 1, 
    borderBottomColor: '#E0E0E0'
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  categoryIcon: { 
    width: normalize(40), 
    height: normalize(40), 
    borderRadius: normalize(20), 
    backgroundColor: '#E8F5E9', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: normalize(12)
  },
  transactionDetails: { flex: 1 },
  transactionTitle: { 
    fontSize: normalize(16), 
    fontFamily: 'Poppins-SemiBold', 
    color: '#000000', 
    marginBottom: normalize(2)
  },
  transactionMessage: { 
    fontSize: normalize(14), 
    fontFamily: 'Poppins-Regular', 
    color: '#666666', 
    marginBottom: normalize(2)
  },
  transactionDate: { 
    fontSize: normalize(12), 
    fontFamily: 'Poppins-Regular', 
    color: '#999999'
  },
  transactionAmount: { 
    fontSize: normalize(16), 
    fontFamily: 'Poppins-Bold', 
    color: '#4A90E2'
  },
  backIcon: { 
    top: normalize(10)
  },
  incomeSourcesSection: { marginTop: normalize(20) },
  incomeSourcesLabel: { 
    fontSize: normalize(16), 
    fontFamily: 'Poppins-Bold', 
    color: '#000000', 
    marginBottom: normalize(10)
  },
  incomeSourcesContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between'
  },
  sourceIcon: { 
    alignItems: 'center', 
    width: '25%', 
    marginBottom: normalize(15)
  },
  sourceLabel: { 
    fontSize: normalize(12), 
    fontFamily: 'Poppins-Regular', 
    color: '#666666', 
    marginTop: normalize(5), 
    textAlign: 'center'
  },
  modalContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: { 
    backgroundColor: '#FFFFFF', 
    padding: normalize(20), 
    borderRadius: normalize(10), 
    width: '80%', 
    maxHeight: '80%', 
    alignItems: 'center'
  },
  modalTitle: { 
    fontSize: normalize(18), 
    fontFamily: 'Poppins-Bold', 
    marginBottom: normalize(15), 
    textAlign: 'center'
  },
  modalInput: { 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: normalize(5), 
    padding: normalize(10), 
    marginBottom: normalize(15), 
    fontFamily: 'Poppins-Regular', 
    width: '100%'
  },
  modalButtons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%'
  },
  modalButton: { 
    flex: 1, 
    padding: normalize(12), 
    borderRadius: normalize(5), 
    marginHorizontal: normalize(5)
  },
  cancelButton: { backgroundColor: '#FF6B6B' },
  addButton: { backgroundColor: '#6FCF97' },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontFamily: 'Poppins-Bold' },
  chartsContainer: { marginTop: normalize(20), marginBottom: normalize(20) },
  chartTitle: { 
    fontSize: normalize(16), 
    fontFamily: 'Poppins-Bold', 
    color: '#000000', 
    marginBottom: normalize(10)
  },
  chart: { marginVertical: normalize(8), borderRadius: normalize(16) },
  noDataText: { 
    fontSize: normalize(14), 
    fontFamily: 'Poppins-Regular', 
    color: '#666666', 
    textAlign: 'center'
  },
  balanceScreenContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF'
  },
  fixedHeader: {
    height: normalize(50),
    backgroundColor: '#6FCF97',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(3) },
    shadowOpacity: 0.25,
    shadowRadius: normalize(4),
    borderRadius: normalize(10),
  },
  balanceContent: { 
    flex: 1, 
    padding: normalize(20), 
    marginBottom: normalize(100)
  },
  cursor: {
    color: '#6FCF97',
    fontWeight: 'bold',
    fontSize: normalize(24),
  },
  loadingTransactionsContainer: {
    padding: normalize(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingTransactionsText: {
    marginTop: normalize(10),
    fontSize: normalize(14),
    fontFamily: 'Poppins-Regular',
    color: '#666666',
  },
  themeToggleContainer: {
    marginTop: normalize(10),
    marginBottom: normalize(5),
  },
  themeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggleTrack: {
    width: normalize(44),
    height: normalize(24),
    borderRadius: normalize(12),
    justifyContent: 'center',
    paddingHorizontal: normalize(2),
  },
  themeToggleThumb: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  themeToggleText: {
    fontFamily: 'Poppins-Regular',
    fontSize: normalize(14),
    marginLeft: normalize(10),
  },
  skeletonLine: {
    height: normalize(14),
    backgroundColor: '#E0E0E0',
    borderRadius: normalize(4),
    overflow: 'hidden',
  },
});

export default HomeScreen;