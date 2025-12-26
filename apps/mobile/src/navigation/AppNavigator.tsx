import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import MedicationFormScreen from '../screens/MedicationFormScreen';
import MedicationListScreen from '../screens/MedicationListScreen';
import RegisterScreen from '../screens/RegisterScreen';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type AppStackParamList = {
  Medications: undefined;
  MedicationForm: { medication?: { id: number; name: string; dosage: string; instructions?: string | null } };
};

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppStack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator() {
  const { token, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? (
        <AppStack.Navigator>
          <AppStack.Screen
            name="Medications"
            component={MedicationListScreen}
            options={{ headerShown: false }}
          />
          <AppStack.Screen name="MedicationForm" component={MedicationFormScreen} />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          {showRegister ? (
            <AuthStack.Screen name="Register">
              {() => <RegisterScreen onSwitch={() => setShowRegister(false)} />}
            </AuthStack.Screen>
          ) : (
            <AuthStack.Screen name="Login">
              {() => <LoginScreen onSwitch={() => setShowRegister(true)} />}
            </AuthStack.Screen>
          )}
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
