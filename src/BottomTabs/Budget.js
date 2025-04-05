import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Alert, Modal, Dimensions, StatusBar, Platform, SafeAreaView, Animated, Easing } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './FirebaseConfig'; // Adjust path if needed
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Use 375 as the base width for scaling

const normalize = (size) => {
  return Math.round(scale * size);
};

const Budget = () => {
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

  const [totalBalance, setTotalBalance] = React.useState(0);
  const [totalIncome, setTotalIncome] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [transactions, setTransactions] = React.useState([]);
  const [showIncomeModal, setShowIncomeModal] = React.useState(false);
  const [selectedSource, setSelectedSource] = React.useState('');
  const [sourceIncome, setSourceIncome] = React.useState('');
  const [incomeSourcesData, setIncomeSourcesData] = React.useState({});
  const [sourceIconsLoaded, setSourceIconsLoaded] = React.useState(false);
  const [chartFullscreen, setChartFullscreen] = React.useState(false);
  
  // Animation values for the income source icons
  const sourceIconsAnimValues = React.useRef(Array(8).fill().map(() => ({
    scale: new Animated.Value(0),
    position: new Animated.Value(0),
    rotation: new Animated.Value(0)
  }))).current;

  // Animation values for balance cards
  const balanceCardAnim = React.useRef({
    scale: new Animated.Value(0.9),
    opacity: new Animated.Value(0)
  }).current;

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

  // Generate shimmer gradient
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

  // Function to trigger balance card animation
  const animateBalanceCards = () => {
    Animated.parallel([
      Animated.timing(balanceCardAnim.scale, {
        toValue: 1,
        duration: 800,
        easing: Easing.elastic(1),
        useNativeDriver: true
      }),
      Animated.timing(balanceCardAnim.opacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      })
    ]).start();
  };

  // Function to trigger staggered animation for source icons
  const animateSourceIcons = () => {
    // Stagger the animations for each source icon
    sourceIconsAnimValues.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 100), // Stagger delay
        Animated.spring(anim.scale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true
        })
      ]).start();

      // Start continuous floating animation
      startFloatingAnimation(anim.position, index);
      
      // Only rotate some of the icons
      if ([0, 2, 4, 6].includes(index)) {
        startRotationAnimation(anim.rotation);
      }
    });

    setSourceIconsLoaded(true);
  };

  const startFloatingAnimation = (positionAnim, index) => {
    const duration = 1500 + (index % 3) * 200; // Vary the duration slightly
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(positionAnim, {
          toValue: -10,
          duration: duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(positionAnim, {
          toValue: 0,
          duration: duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  };

  const startRotationAnimation = (rotationAnim) => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotationAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true
        }),
        Animated.timing(rotationAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true
        })
      ])
    ).start();
  };

  React.useEffect(() => {
    console.log('Starting data fetch...');
    Promise.all([
      fetchBalanceAndIncome(),
      fetchTotalExpenses(),
      fetchTransactions(),
    ])
    .then(() => {
      animateBalanceCards();
      animateSourceIcons();
    })
    .catch((err) => console.error('Data fetch failed:', err));
  }, []);

  React.useEffect(() => {
    console.log('Modal visibility changed to:', showIncomeModal);
  }, [showIncomeModal]);

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

  const getSpendingTrendsData = () => {
    const monthlyData = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Fill in the current and previous 5 months (total 6 months)
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today);
      d.setMonth(today.getMonth() - i);
      const monthKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthlyData[monthKey] = 0; // Initialize with zero
    }
    
    // Add actual transaction data
    transactions.forEach((t) => {
      const month = t.date.toLocaleString('default', { month: 'short' });
      const year = t.date.getFullYear();
      const monthKey = `${month} ${year}`;
      
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey] += t.amount;
      }
    });
    
    const labels = Object.keys(monthlyData);
    const data = Object.values(monthlyData);
    
    // If all values are 0, add a small random value to make chart look better
    if (data.every(val => val === 0)) {
      return {
        labels,
        datasets: [{ 
          data: [10, 20, 15, 30, 25, 40],
          color: (opacity = 1) => `rgba(45, 152, 218, ${opacity})`, 
          strokeWidth: 2
        }]
      };
    }
    
    return {
      labels,
      datasets: [{ 
        data,
        color: (opacity = 1) => `rgba(45, 152, 218, ${opacity})`,
        strokeWidth: 2
      }]
    };
  };

  const getIncomeSourcesPieData = () => {
    const pieData = incomeSources.map((source) => ({
      name: source.name,
      population: incomeSourcesData[source.name] || 0,
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      legendFontColor: isDarkMode ? '#FFFFFF' : '#666666',
      legendFontSize: 12,
    })).filter((item) => item.population > 0);
    return pieData.length ? pieData : [{ name: 'No Data', population: 1, color: '#E0E0E0' }];
  };

  if (!fontsLoaded || loading) {
    // Return skeleton UI instead of loading spinner
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.primary }]}>
        <StatusBar backgroundColor="#6FCF97" barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={[styles.balanceScreenContainer, { backgroundColor: theme.background }]}>
          <View style={styles.fixedHeader}></View>
          <ScrollView style={styles.balanceContent} contentContainerStyle={styles.scrollContentContainer}>
            {/* Header Skeleton */}
            <View style={styles.header}>
              <View style={[styles.skeletonHeader, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
            </View>

            {/* Balance Cards Skeleton */}
            <View style={[styles.skeletonBalanceContainer, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
              <Animated.View style={getShimmerGradient()} />
            </View>

            {/* Income Source Title Skeleton */}
            <View style={styles.incomeSourcesSection}>
              <View style={[styles.skeletonTitle, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
              
              {/* Income Sources Icons Skeleton */}
              <View style={styles.incomeSourcesContainer}>
                {Array(8).fill(0).map((_, index) => (
                  <View key={index} style={styles.sourceIconWrapper}>
                    <View style={[styles.skeletonCircle, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                      <Animated.View style={getShimmerGradient()} />
                    </View>
                    <View style={[styles.skeletonLabel, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                      <Animated.View style={getShimmerGradient()} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Charts Skeleton */}
            <View style={styles.chartsContainer}>
              <View style={[styles.skeletonTitle, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE', alignSelf: 'flex-start', marginLeft: normalize(20) }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
              <View style={[styles.skeletonChart, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
              
              <View style={[styles.skeletonTitle, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE', alignSelf: 'flex-start', marginLeft: normalize(20), marginTop: normalize(20) }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
              <View style={[styles.skeletonChart, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.primary }]}>
      <StatusBar backgroundColor="#6FCF97" barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.balanceScreenContainer, { backgroundColor: theme.background }]}>
        <View style={styles.fixedHeader}></View>
        <ScrollView style={styles.balanceContent} contentContainerStyle={styles.scrollContentContainer}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Account Balance</Text>
          </View>

          {/* Reverted back to the original balance container */}
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
              {incomeSources.map((source, index) => (
                <TouchableOpacity
                  key={source.name}
                  style={styles.sourceIconWrapper}
                  onPress={() => handleOpenModal(source.name)}
                >
                  <Animated.View 
                    style={[
                      styles.sourceIconCircle,
                      {
                        transform: [
                          { scale: sourceIconsAnimValues[index].scale },
                          { 
                            rotate: sourceIconsAnimValues[index].rotation.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0deg', '360deg']
                            }) 
                          }
                        ]
                      }
                    ]}
                  >
                    <Ionicons 
                      name={source.icon} 
                      size={normalize(24)} 
                      color="#FFFFFF" 
                    />
                  </Animated.View>
                  <Text style={[styles.sourceLabel, { color: theme.text }]}>{source.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chartsContainer}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Spending Trend Analysis</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setChartFullscreen(true)}
            >
              <LineChart
                data={getSpendingTrendsData()}
                width={Dimensions.get('window').width - normalize(40)}
                height={normalize(220)}
                chartConfig={{
                  backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                  backgroundGradientFrom: isDarkMode ? theme.card : '#FFFFFF',
                  backgroundGradientTo: isDarkMode ? theme.card : '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(45, 152, 218, ${opacity})`,
                  labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                  style: { borderRadius: normalize(16) },
                  propsForDots: { 
                    r: normalize(4), 
                    strokeWidth: normalize(2), 
                    stroke: '#3498db' 
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '', // Solid lines
                    stroke: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    strokeWidth: 1
                  },
                  fillShadowGradient: '#3498db',
                  fillShadowGradientOpacity: 0.5,
                  useShadowColorFromDataset: false,
                }}
                withShadow={true}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withDots={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                bezier
                style={[
                  styles.chart, 
                  { 
                    backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                    borderRadius: normalize(16),
                    paddingRight: normalize(12),
                    marginVertical: normalize(12),
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: normalize(4) },
                    shadowOpacity: 0.2,
                    shadowRadius: normalize(6),
                  }
                ]}
              />
            </TouchableOpacity>

            <Text style={[styles.chartTitle, { color: theme.text }]}>Income Sources Breakdown</Text>
            {totalIncome > 0 ? (
              <PieChart
                data={getIncomeSourcesPieData()}
                width={Dimensions.get('window').width - normalize(40)}
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
          <SafeAreaView style={styles.modalSafeArea}>
            <View style={styles.modalContainer}>
              <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Add {selectedSource} Income</Text>
                <TextInput
                  style={[styles.modalInput, { color: theme.text, borderColor: theme.border }]}
                  placeholder={`Enter ${selectedSource} income`}
                  placeholderTextColor={theme.subText}
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
          </SafeAreaView>
        </Modal>

        <Modal
          visible={chartFullscreen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setChartFullscreen(false)}
        >
          <SafeAreaView style={[styles.modalSafeArea, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}>
            <View style={styles.chartModalContainer}>
              <View style={styles.chartModalHeader}>
                <Text style={[styles.chartModalTitle, { color: theme.text }]}>Spending Trend Analysis</Text>
                <TouchableOpacity onPress={() => setChartFullscreen(false)}>
                  <Ionicons name="close-circle" size={normalize(30)} color={theme.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.fullscreenChartContainer}>
                <LineChart
                  data={getSpendingTrendsData()}
                  width={SCREEN_WIDTH - normalize(40)}
                  height={SCREEN_HEIGHT * 0.6}
                  chartConfig={{
                    backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                    backgroundGradientFrom: isDarkMode ? theme.card : '#FFFFFF',
                    backgroundGradientTo: isDarkMode ? theme.card : '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(45, 152, 218, ${opacity})`,
                    labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                    style: { borderRadius: normalize(16) },
                    propsForDots: { 
                      r: normalize(6), 
                      strokeWidth: normalize(2), 
                      stroke: '#3498db' 
                    },
                    propsForBackgroundLines: {
                      strokeDasharray: '', // Solid lines
                      stroke: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      strokeWidth: 1
                    },
                    fillShadowGradient: '#3498db',
                    fillShadowGradientOpacity: 0.5,
                    useShadowColorFromDataset: false,
                  }}
                  withShadow={true}
                  withInnerLines={true}
                  withOuterLines={true}
                  withVerticalLines={false}
                  withHorizontalLines={true}
                  withDots={true}
                  withVerticalLabels={true}
                  withHorizontalLabels={true}
                  bezier
                  style={[
                    styles.fullscreenChart, 
                    { 
                      backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                      borderRadius: normalize(16),
                      paddingRight: normalize(12),
                      marginVertical: normalize(12),
                      elevation: 8,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: normalize(4) },
                      shadowOpacity: 0.2,
                      shadowRadius: normalize(6),
                    }
                  ]}
                />
              </View>
              
              <View style={styles.chartLegendContainer}>
                <Text style={[styles.chartLegendText, { color: theme.text }]}>
                  View your spending trends across the past 6 months. Tap on data points for more details.
                </Text>
              </View>
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
  balanceScreenContainer: {
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
  balanceContent: {
    flex: 1,
    padding: normalize(20),
  },
  scrollContentContainer: {
    paddingBottom: normalize(100),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: normalize(20),
    marginTop: normalize(10),
  },
  headerTitle: {
    fontSize: normalize(24),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#6FCF97',
    padding: normalize(20),
    borderRadius: normalize(10),
    marginBottom: normalize(30),
  },
  balanceItem: {
    flex: 1,
    marginHorizontal: normalize(5),
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceIcon: {
    marginRight: normalize(10),
  },
  balanceTitle: {
    fontSize: normalize(14),
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: normalize(18),
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginTop: normalize(5),
  },
  incomeSourcesSection: { 
    marginTop: normalize(30) 
  },
  incomeSourcesLabel: { 
    fontSize: normalize(18), 
    fontFamily: 'Poppins-Bold', 
    color: '#000000', 
    marginBottom: normalize(15) 
  },
  incomeSourcesContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginHorizontal: normalize(5),
  },
  sourceIconWrapper: { 
    alignItems: 'center', 
    width: '25%', 
    marginBottom: normalize(20),
  },
  sourceIconCircle: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
    backgroundColor: '#6FCF97',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: normalize(8),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(2) },
    shadowOpacity: 0.2,
    shadowRadius: normalize(3),
  },
  sourceLabel: { 
    fontSize: normalize(12), 
    fontFamily: 'Poppins-SemiBold', 
    color: '#666666', 
    marginTop: normalize(5), 
    textAlign: 'center'
  },
  chartsContainer: { 
    marginTop: normalize(30), 
    marginBottom: normalize(20),
    alignItems: 'center',
    width: '100%',
  },
  chartCard: {
    width: '100%',
    borderRadius: normalize(15),
    padding: normalize(10),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: normalize(2) },
    shadowOpacity: 0.1,
    shadowRadius: normalize(3),
  },
  chartTitle: { 
    fontSize: normalize(16), 
    fontFamily: 'Poppins-Bold', 
    color: '#000000', 
    marginBottom: normalize(10),
    right: 70,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  chart: { 
    marginVertical: normalize(8), 
    borderRadius: normalize(16),
    alignSelf: 'center',
  },
  noDataText: { 
    fontSize: normalize(14), 
    fontFamily: 'Poppins-Regular', 
    color: '#666666', 
    textAlign: 'center',
    padding: normalize(20),
  },
  modalSafeArea: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: normalize(10),
    padding: normalize(20),
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: normalize(18),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: normalize(20),
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: normalize(5),
    padding: normalize(10),
    fontFamily: 'Poppins-Regular',
    marginBottom: normalize(20),
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    padding: normalize(10),
    borderRadius: normalize(5),
    alignItems: 'center',
    marginHorizontal: normalize(5),
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  addButton: {
    backgroundColor: '#6FCF97',
  },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: normalize(14),
  },
  chartModalContainer: {
    flex: 1,
    padding: normalize(20),
  },
  chartModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  chartModalTitle: {
    fontSize: normalize(20),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  fullscreenChartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: normalize(20),
  },
  fullscreenChart: {
    borderRadius: normalize(16),
    alignSelf: 'center',
  },
  chartLegendContainer: {
    padding: normalize(15),
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: normalize(10),
    marginTop: normalize(20),
  },
  chartLegendText: {
    fontFamily: 'Poppins-Regular',
    fontSize: normalize(14),
    lineHeight: normalize(20),
    textAlign: 'center',
  },
  // Skeleton UI styles
  skeletonHeader: {
    width: normalize(180),
    height: normalize(26),
    borderRadius: normalize(4),
    overflow: 'hidden',
  },
  skeletonBalanceContainer: {
    height: normalize(100),
    borderRadius: normalize(10),
    marginBottom: normalize(30),
    overflow: 'hidden',
  },
  skeletonTitle: {
    width: normalize(150),
    height: normalize(20),
    borderRadius: normalize(4),
    marginBottom: normalize(15),
    overflow: 'hidden',
  },
  skeletonCircle: {
    width: normalize(50),
    height: normalize(50),
    borderRadius: normalize(25),
    marginBottom: normalize(8),
    overflow: 'hidden',
  },
  skeletonLabel: {
    width: normalize(50),
    height: normalize(12),
    borderRadius: normalize(4),
    marginTop: normalize(5),
    overflow: 'hidden',
  },
  skeletonChart: {
    width: Dimensions.get('window').width - normalize(40),
    height: normalize(220),
    borderRadius: normalize(16),
    marginVertical: normalize(8),
    overflow: 'hidden',
  },
});

export default Budget;