import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, StatusBar, Platform, SafeAreaView, Animated, Easing } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import DateTimePickerModal from '@react-native-community/datetimepicker';
import { db, auth } from './FirebaseConfig';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Use 375 as the base width for scaling

const normalize = (size) => {
  return Math.round(scale * size);
};

const Analysis = ({ navigation }) => {
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
  const [transactions, setTransactions] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState('Daily');
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  // Animation for tab indicator
  const [activeTabIndex] = React.useState(new Animated.Value(0));
  
  // Update indicator when tab changes
  React.useEffect(() => {
    let index = 0;
    if (activeTab === 'Weekly') index = 1;
    if (activeTab === 'Monthly') index = 2;
    
    Animated.spring(activeTabIndex, {
      toValue: index,
      useNativeDriver: true,
      friction: 8,
      tension: 100
    }).start();
  }, [activeTab]);

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

  // Fetch data when the component mounts
  React.useEffect(() => {
    fetchData();
  }, []);

  // Refetch data when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      return () => {};
    }, [])
  );

  const fetchData = () => {
    fetchBalanceAndIncome();
    fetchTransactions();
  };

  const fetchBalanceAndIncome = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const balanceRef = doc(db, 'balances', userId);
      const balanceDoc = await getDoc(balanceRef);

      if (balanceDoc.exists()) {
        const data = balanceDoc.data();
        setTotalBalance(data.amount || 0);
        setTotalIncome(data.income || 0);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching balance and income:', error);
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const expensesRef = collection(db, 'users', userId, 'expenses');
      const querySnapshot = await getDocs(expensesRef);

      const transactionsList = [];
      let totalExp = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactionsList.push({
          id: doc.id,
          ...data,
          date: data.date.toDate(),
        });
        totalExp += data.amount;
      });

      transactionsList.sort((a, b) => b.date - a.date);
      setTransactions(transactionsList);
      setTotalExpenses(totalExp);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const filterData = () => {
    const now = new Date();
    const currentDate = selectedDate || now;
    
    // Default to current month if no date selected
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    let filteredTransactions = [];
    let sumIncome = 0;
    let sumExpenses = 0;

    // Apply the filter based on the active tab
    if (activeTab === 'Daily') {
      filteredTransactions = transactions.filter(
        t => t.date >= startOfDay && t.date <= endOfDay
      );
    } else if (activeTab === 'Weekly') {
      filteredTransactions = transactions.filter(
        t => t.date >= startOfWeek && t.date <= endOfWeek
      );
    } else if (activeTab === 'Monthly') {
      filteredTransactions = transactions.filter(
        t => t.date >= startOfMonth && t.date <= endOfMonth
      );
    }

    sumExpenses = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    // Get the filtered income based on the active tab
    if (activeTab === 'Daily') {
      sumIncome = totalIncome; // For simplicity, use total income
    } else if (activeTab === 'Weekly') {
      sumIncome = totalIncome;
    } else if (activeTab === 'Monthly') {
      sumIncome = totalIncome;
    }

    return {
      income: sumIncome,
      expenses: sumExpenses,
    };
  };

  const getChartData = () => {
    const { income, expenses } = filterData();
    return {
      labels: ['Income', 'Expenses'],
      datasets: [
        {
          data: [income || 0, expenses || 0],
          colors: [
            (opacity = 1) => '#3498db', // Blue for income
            (opacity = 1) => '#e74c3c'  // Red for expenses
          ]
        }
      ],
      barColors: ['#3498db', '#e74c3c'] // Blue for income, red for expenses
    };
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
  };

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
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#6FCF97" barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Fixed Green Header Boundary */}
          <View style={styles.fixedHeader}></View>

          {/* Skeleton Content */}
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header Skeleton */}
            <View style={styles.header}>
              <View style={[styles.skeletonGreeting, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
              <View style={[styles.skeletonCalendar, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
            </View>

            {/* Balance Container Skeleton */}
            <View style={[styles.skeletonBalanceContainer, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
              <Animated.View style={getShimmerGradient()} />
            </View>

            {/* Tabs Skeleton */}
            <View style={styles.tabsContainer}>
              {Array(3).fill(0).map((_, index) => (
                <View 
                  key={index} 
                  style={[styles.skeletonTab, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}
                >
                  <Animated.View style={getShimmerGradient()} />
                </View>
              ))}
            </View>

            {/* Chart Title Skeleton */}
            <View style={styles.chartContainer}>
              <View style={[styles.skeletonChartTitle, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>

              {/* Chart Skeleton */}
              <View style={[styles.skeletonChart, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>

              {/* Summary Container Skeleton */}
              <View style={[styles.skeletonSummaryContainer, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                <Animated.View style={getShimmerGradient()} />
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  const { income, expenses } = filterData();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#6FCF97" barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Fixed Green Header Boundary */}
        <View style={styles.fixedHeader}></View>

        {/* Scrollable Content */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: theme.text }]}>Analysis</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={normalize(24)} color={theme.text} style={styles.calendarIcon} />
            </TouchableOpacity>
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
                  <Ionicons name="card-outline" size={normalize(20)} color="#FFFFFF" style={styles.balanceIcon} />
                  <View>
                    <Text style={styles.balanceTitle}>Total Expenses</Text>
                    <Text style={[styles.balanceAmount, styles.expenseAmount]}>-₱{totalExpenses.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Daily' && styles.activeTab, { backgroundColor: isDarkMode ? theme.tab : '#F0F0F0' }]}
              onPress={() => setActiveTab('Daily')}
            >
              <Text style={[styles.tabText, activeTab === 'Daily' && styles.activeTabText, { color: isDarkMode ? theme.text : '#000000' }]}>Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Weekly' && styles.activeTab, { backgroundColor: isDarkMode ? theme.tab : '#F0F0F0' }]}
              onPress={() => setActiveTab('Weekly')}
            >
              <Text style={[styles.tabText, activeTab === 'Weekly' && styles.activeTabText, { color: isDarkMode ? theme.text : '#000000' }]}>Weekly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'Monthly' && styles.activeTab, { backgroundColor: isDarkMode ? theme.tab : '#F0F0F0' }]}
              onPress={() => setActiveTab('Monthly')}
            >
              <Text style={[styles.tabText, activeTab === 'Monthly' && styles.activeTabText, { color: isDarkMode ? theme.text : '#000000' }]}>Monthly</Text>
            </TouchableOpacity>
            <Animated.View 
              style={[
                styles.activeIndicator,
                {
                  transform: [
                    {
                      translateX: activeTabIndex.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [
                          SCREEN_WIDTH / 6 - normalize(15),
                          SCREEN_WIDTH / 2 - normalize(15),
                          5 * SCREEN_WIDTH / 6 - normalize(15)
                        ]
                      })
                    }
                  ]
                }
              ]} 
            />
          </View>

          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              {activeTab} Income and Expenses -{' '}
              {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
            <BarChart
              data={getChartData()}
              width={Dimensions.get('window').width - normalize(40)}
              height={normalize(220)}
              chartConfig={{
                backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                backgroundGradientFrom: isDarkMode ? theme.card : '#FFFFFF',
                backgroundGradientTo: isDarkMode ? theme.card : '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(102, 102, 102, ${opacity})`,
                style: { borderRadius: normalize(16) },
                barPercentage: 0.7,
              }}
              showValuesOnTopOfBars={true}
              withCustomBarColorFromData={true}
              flatColor={true}
              fromZero={true}
              style={[styles.chart, { 
                backgroundColor: isDarkMode ? theme.card : '#FFFFFF',
                borderRadius: normalize(16),
                padding: normalize(10),
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: normalize(2) },
                shadowOpacity: 0.2,
                shadowRadius: normalize(3),
              }]}
            />

            <View style={[styles.summaryContainer, { backgroundColor: '#6FCF97' }]}>
              <View style={styles.summaryItem}>
                <View style={styles.summaryRow}>
                  <Ionicons name="arrow-up-outline" size={normalize(20)} color="#FFFFFF" style={styles.summaryIcon} />
                  <View>
                    <Text style={styles.summaryTitle}>Income</Text>
                    <Text style={styles.summaryAmount}>₱{income.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.summaryItem}>
                <View style={styles.summaryRow}>
                  <Ionicons name="arrow-down-outline" size={normalize(20)} color="#FFFFFF" style={styles.summaryIcon} />
                  <View>
                    <Text style={styles.summaryTitle}>Expenses</Text>
                    <Text style={styles.summaryAmount}>₱{expenses.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {showDatePicker && (
          <DateTimePickerModal
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: normalize(20),
    marginTop: normalize(10),
  },
  greeting: {
    fontSize: normalize(24),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
  },
  calendarIcon: {
    padding: normalize(4),
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#6FCF97',
    padding: normalize(20),
    borderRadius: normalize(10),
    marginBottom: normalize(20),
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
  expenseAmount: { 
    color: '#4A90E2' 
  },
  tabsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: normalize(20),
    position: 'relative'
  },
  tab: { 
    backgroundColor: '#F0F0F0', 
    paddingVertical: normalize(10), 
    paddingHorizontal: normalize(20), 
    borderRadius: normalize(20),
    flex: 1,
    marginHorizontal: normalize(4),
    alignItems: 'center'
  },
  activeTab: { 
    backgroundColor: '#6FCF97' 
  },
  tabText: { 
    fontSize: normalize(14), 
    fontFamily: 'Poppins-Regular', 
    color: '#000000' 
  },
  activeTabText: { 
    color: '#FFFFFF' 
  },
  chartContainer: {
    alignItems: 'center',
  },
  chartTitle: { 
    fontSize: normalize(16), 
    fontFamily: 'Poppins-Bold', 
    color: '#000000', 
    marginBottom: normalize(10), 
    textAlign: 'center' 
  },
  chart: { 
    marginVertical: normalize(8), 
    borderRadius: normalize(16) 
  },
  summaryContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    backgroundColor: '#6FCF97', 
    padding: normalize(20), 
    borderRadius: normalize(10), 
    marginTop: normalize(20),
    width: '100%',
  },
  summaryIcon: { 
    marginRight: normalize(8), 
    bottom: normalize(20) 
  },
  summaryItem: { 
    flex: 1, 
    marginHorizontal: normalize(5) 
  },
  summaryRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  summaryTitle: { 
    fontSize: normalize(14), 
    fontFamily: 'Poppins-Regular', 
    color: '#FFFFFF' 
  },
  summaryAmount: { 
    fontSize: normalize(18), 
    fontFamily: 'Poppins-Bold', 
    color: '#FFFFFF', 
    marginTop: normalize(5) 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF' 
  },
  activeIndicator: {
    position: 'absolute',
    bottom: normalize(-3),
    width: normalize(30),
    height: normalize(3),
    backgroundColor: '#6FCF97',
    borderRadius: normalize(1.5),
  },
  // Skeleton UI styles
  skeletonGreeting: {
    width: normalize(120),
    height: normalize(28),
    borderRadius: normalize(4),
    overflow: 'hidden',
  },
  skeletonCalendar: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    overflow: 'hidden',
  },
  skeletonBalanceContainer: {
    height: normalize(100),
    borderRadius: normalize(10),
    marginBottom: normalize(20),
    overflow: 'hidden',
  },
  skeletonTab: {
    flex: 1,
    height: normalize(40),
    borderRadius: normalize(20),
    marginHorizontal: normalize(4),
    overflow: 'hidden',
  },
  skeletonChartTitle: {
    width: normalize(250),
    height: normalize(20),
    borderRadius: normalize(4),
    marginBottom: normalize(10),
    overflow: 'hidden',
  },
  skeletonChart: {
    width: Dimensions.get('window').width - normalize(40),
    height: normalize(220),
    borderRadius: normalize(16),
    marginVertical: normalize(8),
    overflow: 'hidden',
  },
  skeletonSummaryContainer: {
    width: '100%',
    height: normalize(80),
    borderRadius: normalize(10),
    marginTop: normalize(20),
    overflow: 'hidden',
  },
});

export default Analysis;