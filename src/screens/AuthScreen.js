import * as React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { auth, db } from '../screens/FirebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const AuthScreen = ({ navigation }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fullName, setFullName] = React.useState('');
  const [mobileNumber, setMobileNumber] = React.useState('');
  const [isLogin, setIsLogin] = React.useState(true);
  const [showPassword, setShowPassword] = React.useState(false);

  const handleAuth = async () => {
    try {
      if (isLogin) {
        // Log in
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Logged in successfully');
        navigation.replace('Bottomtabs'); // Navigate to Bottomtabs screen on successful login
      } else {
        // Sign up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('Signed up successfully');

        // Store user data in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: email,
          fullName: fullName,
          mobileNumber: mobileNumber,
        });

        setIsLogin(true); // Switch to login mode after signup
      }
    } catch (error) {
      console.error('Authentication error:', error);
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isLogin ? 'Welcome' : 'Create Account'}</Text>
      </View>
      <View style={styles.formContainer}>
        {isLogin ? (
          <LoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            handleAuth={handleAuth}
          />
        ) : (
          <SignUpForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            fullName={fullName}
            setFullName={setFullName}
            mobileNumber={mobileNumber}
            setMobileNumber={setMobileNumber}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            handleAuth={handleAuth}
          />
        )}
        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
          <Text style={isLogin ? styles.loginToggleText : styles.signUpToggleText}>
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
          </Text>
        </TouchableOpacity>
        {isLogin && (
          <TouchableOpacity style={styles.googleButton} onPress={() => Alert.alert('Google Sign In', 'Functionality not implemented yet.')}>
            <Image source={require('../assets/images/google.png')} style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Sign In with Google</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const LoginForm = ({ email, setEmail, password, setPassword, showPassword, setShowPassword, handleAuth }) => (
  <View style={styles.form}>
    <View style={styles.inputContainer}>
      <FontAwesome name="envelope" size={17} color="#CCCCCC" style={styles.inputIcon} />
      <Text style={styles.label}>Username or Email</Text>
      <TextInput
        style={styles.input}
        placeholder="example@gmail.com"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
    </View>
    <View style={styles.inputContainer}>
      <FontAwesome name="lock" size={23} color="#CCCCCC" style={styles.inputIcon} />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
      />
      <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#CCCCCC" />
      </TouchableOpacity>
    </View>
    <TouchableOpacity style={styles.loginButton} onPress={handleAuth}>
      <Text style={styles.loginButtonText}>Log In</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.forgotPassword} onPress={() => Alert.alert('Forgot Password', 'Functionality not implemented yet.')}>
      <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
    </TouchableOpacity>
  </View>
);

const SignUpForm = ({ email, setEmail, password, setPassword, fullName, setFullName, mobileNumber, setMobileNumber, showPassword, setShowPassword, handleAuth }) => (
  <View style={styles.form}>
    <View style={styles.inputContainer}>
      <FontAwesome name="user" size={20} color="#CCCCCC" style={styles.inputIcon} />
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />
    </View>
    <View style={styles.inputContainer}>
      <FontAwesome name="phone" size={20} color="#CCCCCC" style={styles.inputIcon} />
      <Text style={styles.label}>Mobile Number</Text>
      <TextInput
        style={styles.input}
        placeholder="Mobile Number"
        value={mobileNumber}
        onChangeText={setMobileNumber}
        keyboardType="phone-pad"
      />
    </View>
    <View style={styles.inputContainer}>
      <FontAwesome name="envelope" size={17} color="#CCCCCC" style={styles.inputIcon} />
      <Text style={styles.label}>Username or Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Username or Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
    </View>
    <View style={styles.inputContainer}>
      <FontAwesome name="lock" size={20} color="#CCCCCC" style={styles.inputIcon} />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!showPassword}
      />
      <TouchableOpacity style={styles.passwordToggle} onPress={() => setShowPassword(!showPassword)}>
        <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#CCCCCC" />
      </TouchableOpacity>
    </View>
    <View style={styles.inputContainer}>
      <FontAwesome name="lock" size={20} color="#CCCCCC" style={styles.inputIcon} />
      <Text style={styles.label}>Confirm Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        secureTextEntry={!showPassword}
      />
    </View>
    <TouchableOpacity style={styles.signUpButton} onPress={handleAuth}>
      <Text style={styles.signUpButtonText}>Sign Up</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6FCF97',
  },
  header: {
    flex: 0.4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  title: {
    fontSize: 27,
    fontFamily: 'Poppins-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1.6,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  form: {
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 25,
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 15,
    zIndex: 1,
    top: 10,
  },
  label: {
    position: 'absolute',
    top: -23,
    left: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    color: '#6FCF97',
  },
  input: {
    borderColor: '#CCCCCC',
    borderWidth: 1,
    paddingHorizontal: 45,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    fontFamily: 'Poppins-Regular',
    textAlign: 'left',
    width: '100%',
    paddingVertical: 10,
    fontSize: 12,
    marginBottom: 5,
  },
  passwordToggle: {
    position: 'absolute',
    right: 15,
    zIndex: 1,
  },
  loginButton: {
    backgroundColor: '#6FCF97',
    padding: 10,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
    width: '250',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  signUpButton: {
    backgroundColor: '#6FCF97', // Different color for sign-up button
    padding: 10,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    padding: 8,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 20,
    paddingRight: 20,
    left: 30,
    bottom: 200,
    width: '260',
  },
  googleIcon: {
    width: 30,
    height: 30,
    marginRight: 10,
  },
  googleButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Poppins-Regular',
  },
  forgotPassword: {
    alignItems: 'center',
    marginBottom: 10,
  },
  forgotPasswordText: {
    color: '#007BFF',
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
  },
  loginToggleText: {
    marginTop: 200,
    textAlign: 'center',
    color: '#007BFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  signUpToggleText: {
    marginTop: 15,
    textAlign: 'center',
    color: '#007BFF',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
});

export default AuthScreen;
