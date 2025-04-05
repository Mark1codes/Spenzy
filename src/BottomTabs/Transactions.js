import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions, StatusBar, Platform, SafeAreaView, Animated, Easing } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './FirebaseConfig';
import { doc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const scale = SCREEN_WIDTH / 375; // Use 375 as the base width for scaling

const normalize = (size) => {
  return Math.round(scale * size);
};

const TransactionsScreen = () => {
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

  const [transactions, setTransactions] = React.useState([]);
  const [totalBalance, setTotalBalance] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

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

  React.useEffect(() => {
    fetchBalance();
    fetchTotalExpenses();
    fetchTransactions();
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
          date: data.date.toDate()
        });
      });

      // Sort by date, newest first
      transactionsList.sort((a, b) => b.date - a.date);
      setTransactions(transactionsList);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const deleteTransaction = async (transactionId) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Delete from Firestore
      const transactionRef = doc(db, 'users', userId, 'expenses', transactionId);
      await deleteDoc(transactionRef);

      // Update local state
      setTransactions(prevTransactions => 
        prevTransactions.filter(t => t.id !== transactionId)
      );

      // Recalculate total expenses
      fetchTotalExpenses();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  if (!fontsLoaded || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor="#6FCF97" barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          {/* Fixed Green Header */}
          <View style={styles.fixedHeader}></View>

          {/* Skeleton Content */}
          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
            {/* Screen Title Skeleton */}
            <View style={[styles.skeletonScreenTitle, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
              <Animated.View style={getShimmerGradient()} />
            </View>

            {/* Balance Card Skeleton */}
            <View style={[styles.skeletonBalanceCard, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
              <Animated.View style={getShimmerGradient()} />
            </View>

            {/* Transactions List Skeleton */}
            <View style={styles.transactionsList}>
              {Array(6).fill(0).map((_, index) => (
                <View key={index} style={[styles.skeletonTransactionItem, { 
                  borderBottomColor: theme.border,
                  borderBottomWidth: 1,
                }]}>
                  <View style={styles.transactionLeft}>
                    <View style={[styles.skeletonCategoryIcon, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                      <Animated.View style={getShimmerGradient()} />
                    </View>
                    <View style={styles.transactionDetails}>
                      <View style={[styles.skeletonTransactionTitle, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                        <Animated.View style={getShimmerGradient()} />
                      </View>
                      <View style={[styles.skeletonTransactionMessage, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                        <Animated.View style={getShimmerGradient()} />
                      </View>
                      <View style={[styles.skeletonTransactionDate, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
                        <Animated.View style={getShimmerGradient()} />
                      </View>
                    </View>
                  </View>
                  <View style={[styles.skeletonTransactionAmount, { backgroundColor: isDarkMode ? '#333333' : '#EEEEEE' }]}>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#6FCF97" barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Fixed Green Header */}
        <View style={styles.fixedHeader}></View>

        {/* Scrollable Content */}
        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
          <Text style={[styles.screenTitle, { color: theme.text }]}>Transaction</Text>

          <View style={styles.balanceCard}>
            <View style={styles.mainBalanceContainer}>
              <View style={[styles.whiteCard, { backgroundColor: isDarkMode ? theme.card : '#FFFFFF' }]}>
                <View style={styles.iconTextGroup}>
                  <Ionicons name="wallet" size={normalize(20)} color="#6FCF97" style={styles.icon} />
                  <Text style={[styles.balanceTitle, { color: theme.text }]}>Total Balance</Text>
                </View>
                <Text style={[styles.balanceAmount, { color: theme.text }]}>₱{totalBalance.toFixed(2)}</Text>
              </View>
            </View>
            
            <View style={styles.secondaryBalanceContainer}>
              <View style={[styles.balanceHalf, { backgroundColor: isDarkMode ? theme.card : '#FFFFFF' }]}>
                <View style={styles.iconTextGroup}>
                  <Ionicons name="wallet-outline" size={normalize(20)} color={isDarkMode ? theme.text : "#000000"} style={styles.icon} />
                  <Text style={[styles.secondaryBalanceLabel, { color: theme.text }]}>Balance</Text>
                </View>
                <Text style={[styles.secondaryBalanceAmount, { color: theme.text }]}>₱{totalBalance.toFixed(2)}</Text>
              </View>
              <View style={[styles.balanceHalf, { backgroundColor: isDarkMode ? theme.card : '#FFFFFF' }]}>
                <View style={styles.iconTextGroup}>
                  <Ionicons name="card-outline" size={normalize(20)} color={isDarkMode ? theme.text : "#000000"} style={styles.icon} />
                  <Text style={[styles.secondaryBalanceLabel, { color: theme.text }]}>Total Expenses</Text>
                </View>
                <Text style={[styles.secondaryBalanceAmount, styles.expensesAmount]}>-₱{totalExpenses.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: totalBalance > 0 ? `${(totalExpenses / totalBalance) * 100}%` : '0%' }]} />
              </View>
              <Text style={styles.progressText}>{totalBalance > 0 ? `${((totalExpenses / totalBalance) * 100).toFixed(0)}%` : '0%'} of your expenses</Text>
            </View>
          </View>

          <View style={styles.transactionsList}>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="receipt-outline" size={normalize(32)} color="#6FCF97" />
                </View>
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>No Transactions</Text>
                <ActivityIndicator style={styles.loadingIndicator} size="small" color="#6FCF97" />
              </View>
            ) : (
              <View style={styles.transactionsContainer}>
                {transactions.map((transaction) => (
                  <View key={transaction.id} style={[styles.transactionItem, { borderBottomColor: theme.border }]}>
                    <View style={styles.transactionLeft}>
                      <View style={[styles.categoryIcon, { backgroundColor: theme.categoryIcon }]}>
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
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={styles.transactionAmount}>-₱{transaction.amount.toFixed(2)}</Text>
                      <TouchableOpacity 
                        onPress={() => deleteTransaction(transaction.id)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={normalize(20)} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
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
    flex: 1,
    paddingHorizontal: normalize(20),
  },
  scrollContentContainer: {
    paddingBottom: normalize(100),
    paddingTop: normalize(10),
  },
  screenTitle: {
    fontSize: normalize(24),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: normalize(20),
    marginTop: normalize(10),
  },
  balanceCard: {
    backgroundColor: '#6FCF97',
    padding: normalize(20),
    borderRadius: normalize(10),
    marginBottom: normalize(20),
  },
  mainBalanceContainer: {
    alignItems: 'center',
    marginBottom: normalize(20),
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    padding: normalize(15),
    borderRadius: normalize(8),
    width: '100%',
    alignItems: 'center',
  },
  iconTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: normalize(4),
  },
  icon: {
    marginRight: normalize(4),
  },
  balanceTitle: {
    fontSize: normalize(14),
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  balanceAmount: {
    fontSize: normalize(24),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginTop: normalize(5),
  },
  secondaryBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: normalize(15),
    paddingHorizontal: normalize(10),
  },
  balanceHalf: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryBalanceLabel: {
    fontSize: normalize(12),
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  secondaryBalanceAmount: {
    fontSize: normalize(18),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
  },
  expensesAmount: {
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
  transactionsList: {
    flex: 1,
  },
  monthSection: {
    marginBottom: normalize(20),
  },
  monthTitle: {
    fontSize: normalize(18),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: normalize(10),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: normalize(40),
  },
  emptyIconCircle: {
    width: normalize(60),
    height: normalize(60),
    borderRadius: normalize(30),
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: normalize(16),
  },
  emptyStateTitle: {
    fontSize: normalize(18),
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: normalize(12),
  },
  loadingIndicator: {
    marginTop: normalize(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  transactionsContainer: {
    paddingTop: normalize(10),
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: normalize(15),
    paddingHorizontal: normalize(10),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: normalize(12),
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: normalize(16),
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: normalize(2),
  },
  transactionMessage: {
    fontSize: normalize(14),
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    marginBottom: normalize(2),
  },
  transactionDate: {
    fontSize: normalize(12),
    fontFamily: 'Poppins-Regular',
    color: '#999999',
  },
  transactionAmount: {
    fontSize: normalize(16),
    fontFamily: 'Poppins-Bold',
    color: '#4A90E2',
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(10),
  },
  deleteButton: {
    padding: normalize(8),
  },
  // Skeleton UI styles
  skeletonScreenTitle: {
    width: normalize(150),
    height: normalize(28),
    borderRadius: normalize(4),
    marginBottom: normalize(20),
    marginTop: normalize(10),
    overflow: 'hidden',
  },
  skeletonBalanceCard: {
    height: normalize(220),
    borderRadius: normalize(10),
    marginBottom: normalize(20),
    overflow: 'hidden',
  },
  skeletonTransactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: normalize(15),
    paddingHorizontal: normalize(10),
  },
  skeletonCategoryIcon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    marginRight: normalize(12),
    overflow: 'hidden',
  },
  skeletonTransactionTitle: {
    width: normalize(120),
    height: normalize(16),
    borderRadius: normalize(4),
    marginBottom: normalize(8),
    overflow: 'hidden',
  },
  skeletonTransactionMessage: {
    width: normalize(180),
    height: normalize(14),
    borderRadius: normalize(4),
    marginBottom: normalize(8),
    overflow: 'hidden',
  },
  skeletonTransactionDate: {
    width: normalize(100),
    height: normalize(12),
    borderRadius: normalize(4),
    overflow: 'hidden',
  },
  skeletonTransactionAmount: {
    width: normalize(80),
    height: normalize(16),
    borderRadius: normalize(4),
    overflow: 'hidden',
  },
});

export default TransactionsScreen;