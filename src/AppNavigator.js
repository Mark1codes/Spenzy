import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import Onboarding from './screens/Onboarding';
import AuthScreen from './screens/AuthScreen';
import Bottomtabs from './screens/Bottomtabs';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Onboarding">  
        <Stack.Screen
          name="Onboarding"
          component={Onboarding}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AuthScreen"     
          component={AuthScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Bottomtabs"  
          component={Bottomtabs}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
