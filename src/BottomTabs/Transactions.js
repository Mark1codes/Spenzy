import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './FirebaseConfig';
import { doc, getDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

const TransactionsScreen = () => {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  });

  const [transactions, setTransactions] = React.useState([]);
  const [totalBalance, setTotalBalance] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6FCF97" />
      </View>
    );
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Food':
        return 'restaurant-outline';
      case 'Transport':
        return 'bus-outline';
      case 'Medicine':
        return 'medical-outline';
      case 'Groceries':
        return 'cart-outline';
      case 'Rent':
        return 'home-outline';
      case 'Gifts':
        return 'gift-outline';
      case 'Savings':
        return 'wallet-outline';
      case 'Entertainment':
        return 'game-controller-outline';
      default:
        return 'add-outline';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Transaction</Text>

      <View style={styles.balanceCard}>
        <View style={styles.mainBalanceContainer}>
          <View style={styles.whiteCard}>
            <View style={styles.iconTextGroup}>
              <Ionicons name="wallet" size={20} color="#6FCF97" style={styles.icon} />
              <Text style={styles.balanceTitle}>Total Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>₱{totalBalance.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.secondaryBalanceContainer}>
          <View style={styles.balanceHalf}>
            <View style={styles.iconTextGroup}>
              <Ionicons name="wallet-outline" size={20} color="#000000" style={styles.icon} />
              <Text style={styles.secondaryBalanceLabel}>Balance</Text>
            </View>
            <Text style={styles.secondaryBalanceAmount}>₱{totalBalance.toFixed(2)}</Text>
          </View>
          <View style={styles.balanceHalf}>
            <View style={styles.iconTextGroup}>
              <Ionicons name="card-outline" size={20} color="#000000" style={styles.icon} />
              <Text style={styles.secondaryBalanceLabel}>Total Expenses</Text>
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

      <ScrollView style={styles.transactionsList}>
        {transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={32} color="#6FCF97" />
            </View>
            <Text style={styles.emptyStateTitle}>No Transactions</Text>
            <ActivityIndicator style={styles.loadingIndicator} size="small" color="#6FCF97" />
          </View>
        ) : (
          <View style={styles.transactionsContainer}>
            {transactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={styles.categoryIcon}>
                    <Ionicons 
                      name={getCategoryIcon(transaction.category)} 
                      size={24} 
                      color="#6FCF97" 
                    />
                  </View>
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionTitle}>{transaction.title}</Text>
                    <Text style={styles.transactionMessage}>{transaction.message || 'No message'}</Text>
                    <Text style={styles.transactionDate}>
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
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: 20,
    marginTop: 20,
  },
  balanceCard: {
    backgroundColor: '#6FCF97',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  mainBalanceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  iconTextGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  icon: {
    marginRight: 4,
  },
  balanceTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  balanceAmount: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginTop: 5,
  },
  secondaryBalanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  balanceHalf: {
    flex: 1,
    alignItems: 'center',
  },
  secondaryBalanceLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  secondaryBalanceAmount: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
  },
  expensesAmount: {
    color: '#4A90E2',
  },
  progressContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    width: '0%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    opacity: 0.8,
    textAlign: 'center',
  },
  transactionsList: {
    flex: 1,
  },
  monthSection: {
    marginBottom: 20,
  },
  monthTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginBottom: 12,
  },
  loadingIndicator: {
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  transactionsContainer: {
    paddingTop: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    color: '#000000',
    marginBottom: 2,
  },
  transactionMessage: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#666666',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#999999',
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#4A90E2',
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    padding: 8,
  },
});

export default TransactionsScreen;
