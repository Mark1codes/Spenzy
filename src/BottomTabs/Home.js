import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './FirebaseConfig';
import { doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

const HomeScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  });

  const [activeTab, setActiveTab] = React.useState('Daily');
  const [totalBalance, setTotalBalance] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [isBalanceModalVisible, setBalanceModalVisible] = React.useState(false);
  const [newBalance, setNewBalance] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [transactions, setTransactions] = React.useState([]);

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
      Alert.alert('Error', 'Failed to fetch balance');
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

  const handleUpdateBalance = async () => {
    try {
      const amount = parseFloat(newBalance);
      if (isNaN(amount)) {
        Alert.alert('Error', 'Please enter a valid number');
        return;
      }

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const balanceRef = doc(db, 'balances', userId);
      await setDoc(balanceRef, {
        amount,
        updatedAt: new Date()
      });

      setTotalBalance(amount);
      setBalanceModalVisible(false);
      setNewBalance('');
      Alert.alert('Success', 'Balance updated successfully');
    } catch (error) {
      console.error('Error updating balance:', error);
      Alert.alert('Error', 'Failed to update balance');
    }
  };

  const filterTransactions = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (activeTab) {
      case 'Daily':
        return transactions.filter(t => t.date >= startOfDay);
      case 'Weekly':
        return transactions.filter(t => t.date >= startOfWeek);
      case 'Monthly':
        return transactions.filter(t => t.date >= startOfMonth);
      default:
        return transactions;
    }
  };

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

  const renderTransactions = () => {
    const filteredTransactions = filterTransactions();

    if (filteredTransactions.length === 0) {
      return (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={32} color="#6FCF97" />
          </View>
          <Text style={styles.emptyStateTitle}>No Transactions</Text>
        </View>
      );
    }

    return (
      <View style={styles.transactionsContainer}>
        {filteredTransactions.map((transaction) => (
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
              <Text style={styles.transactionAmount}>-₱{transaction.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (!fontsLoaded || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6FCF97" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, Welcome Back</Text>
        <Text style={styles.subGreeting}>Good Morning</Text>
      </View>

      <View style={styles.balanceContainer}>
        <TouchableOpacity 
          style={styles.balanceItem}
          onPress={() => setBalanceModalVisible(true)}
        >
          <View style={styles.balanceRow}>
            <View style={styles.iconTextGroup}>
              <Ionicons name="wallet-outline" size={20} color="#FFFFFF" style={styles.balanceIcon} />
              <View>
                <Text style={styles.balanceTitle}>Total Balance</Text>
                <Text style={styles.balanceAmount}>₱{totalBalance.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.balanceItem}>
          <View style={styles.balanceRow}>
            <View style={styles.iconTextGroup}>
              <Ionicons name="card-outline" size={20} color="#FFFFFF" style={styles.balanceIcon} />
              <View>
                <Text style={styles.balanceTitle}>Total Expenses</Text>
                <Text style={[styles.balanceAmount, styles.expenseAmount]}>-₱{totalExpenses.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: totalBalance > 0 ? `${(totalExpenses / totalBalance) * 100}%` : '0%' }]} />
        </View>
        <Text style={styles.progressText}>Spent ₱{totalExpenses.toFixed(2)} of ₱{totalBalance.toFixed(2)}</Text>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Daily' && styles.activeTab]}
          onPress={() => setActiveTab('Daily')}
        >
          <Text style={[styles.tabText, activeTab === 'Daily' && styles.activeTabText]}>Daily</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Weekly' && styles.activeTab]}
          onPress={() => setActiveTab('Weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'Weekly' && styles.activeTabText]}>Weekly</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'Monthly' && styles.activeTab]}
          onPress={() => setActiveTab('Monthly')}
        >
          <Text style={[styles.tabText, activeTab === 'Monthly' && styles.activeTabText]}>Monthly</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {renderTransactions()}
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('Category')}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={isBalanceModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Balance</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              keyboardType="numeric"
              value={newBalance}
              onChangeText={setNewBalance}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setBalanceModalVisible(false);
                  setNewBalance('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addButton]}
                onPress={handleUpdateBalance}
              >
                <Text style={styles.buttonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    top: 20,
  },
  subGreeting: {
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
    color: '#A0A0A0',
    top: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#6FCF97',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  balanceItem: {
    flex: 1,
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
    marginRight: 8,
    bottom: 20,
  },
  balanceTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginTop: 5,
  },
  expenseAmount: {
    color: '#4A90E2',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6FCF97',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#A0A0A0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontFamily: 'Poppins-Regular',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  addButton: {
    backgroundColor: '#6FCF97',
  },
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Poppins-Bold',
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  tab: {
    backgroundColor: '#F0F0F0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#6FCF97',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
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
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionAmount: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: '#4A90E2',
  },
  deleteButton: {
    padding: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6FCF97',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default HomeScreen;
