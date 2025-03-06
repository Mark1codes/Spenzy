import * as React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from './FirebaseConfig';
import { doc, getDoc, updateDoc, collection, addDoc, getDocs } from 'firebase/firestore';

const categories = [
  { id: 1, name: 'Food', icon: 'restaurant-outline' },
  { id: 2, name: 'Transport', icon: 'bus-outline' },
  { id: 3, name: 'Medicine', icon: 'medical-outline' },
  { id: 4, name: 'Groceries', icon: 'cart-outline' },
  { id: 5, name: 'Rent', icon: 'home-outline' },
  { id: 6, name: 'Gifts', icon: 'gift-outline' },
  { id: 7, name: 'Savings', icon: 'wallet-outline' },
  { id: 8, name: 'Entertainment', icon: 'game-controller-outline' },
  { id: 9, name: 'More', icon: 'add-outline' },
];

const Category = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    'Poppins-Regular': require('../assets/fonts/Poppins-Regular.ttf'),
    'Poppins-Bold': require('../assets/fonts/Poppins-Bold.ttf'),
    'Poppins-SemiBold': require('../assets/fonts/Poppins-SemiBold.ttf'),
  });

  const [totalBalance, setTotalBalance] = React.useState(0);
  const [totalExpenses, setTotalExpenses] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [isExpenseModalVisible, setExpenseModalVisible] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [expenseAmount, setExpenseAmount] = React.useState('');
  const [expenseTitle, setExpenseTitle] = React.useState('');
  const [expenseMessage, setExpenseMessage] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(new Date());

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

      const userId = auth.currentUser?.uid;
      if (!userId) return;

      // Add expense to expenses collection
      const expenseData = {
        amount,
        title: expenseTitle,
        category: selectedCategory.name,
        message: expenseMessage,
        date: selectedDate,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'users', userId, 'expenses'), expenseData);

      // Update total balance
      const balanceRef = doc(db, 'balances', userId);
      const newBalance = totalBalance - amount;
      await updateDoc(balanceRef, { amount: newBalance });

      // Update states
      setTotalBalance(newBalance);
      setTotalExpenses(prev => prev + amount);
      
      // Reset form
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

  if (!fontsLoaded || loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Categories</Text>
      </View>

      <View style={styles.balanceCard}>
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
            <View style={[styles.progressFill, { width: totalBalance > 0 ? `${(totalExpenses / totalBalance) * 100}%` : '0%' }]} />
          </View>
          <Text style={styles.progressText}>{totalBalance > 0 ? `${((totalExpenses / totalBalance) * 100).toFixed(0)}%` : '0%'} of your expenses</Text>
        </View>
      </View>

      <ScrollView>
        <View style={styles.categoriesGrid}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryItem}
              onPress={() => {
                setSelectedCategory(category);
                setExpenseModalVisible(true);
              }}
            >
              <View style={styles.categoryIcon}>
                <Ionicons name={category.icon} size={24} color="#6FCF97" />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={isExpenseModalVisible}
        transparent={false}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setExpenseModalVisible(false)}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Expenses</Text>
            <View style={{ width: 40 }} /> {/* For balance */}
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Date</Text>
              <Text style={styles.dateText}>
                {selectedDate.toLocaleDateString('en-US', { 
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <Text style={styles.categoryText}>
                {selectedCategory?.name || 'Select the category'}
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="₱0.00"
                keyboardType="numeric"
                value={expenseAmount}
                onChangeText={setExpenseAmount}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Expense Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter title"
                value={expenseTitle}
                onChangeText={setExpenseTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Message (Optional)</Text>
              <TextInput
                style={[styles.input, styles.messageInput]}
                placeholder="Enter message"
                value={expenseMessage}
                onChangeText={setExpenseMessage}
                multiline
              />
            </View>

            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleAddExpense}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 10,
    top: 7,
  },
  screenTitle: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#000000',
    marginTop: 20,
  },
  balanceCard: {
    backgroundColor: '#6FCF97',
    padding: 20,
    borderRadius: 10,
    marginBottom: 30,
  },
  mainBalance: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balanceTitle: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
  },
  balanceAmount: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    marginTop: 5,
  },
  expensesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  expenseItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  expenseAmount: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  redText: {
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
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  categoryItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
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
    padding: 20,
    backgroundColor: '#6FCF97',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#000000',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#6FCF97',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
  },
});

export default Category;
