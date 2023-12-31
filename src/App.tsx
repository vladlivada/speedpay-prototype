import React, {useEffect, useState} from 'react';
import {Button, NativeEventEmitter, NativeModules, View} from 'react-native';

import {createNavigationContainerRef, NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {Map} from './screens/CarIntegration/Map';
import {Menu} from './screens/CarIntegration/Menu';
import {CarPlay} from 'react-native-carplay';
import {SCREEN_ROUTES} from "./utils/constants";
import NearbyMerchantsScreen from "./screens/NearbyMerchants/NearbyMerchants";
import PaymentsScreen from "./screens/Payments/Payments";
import BottomNavigation from "./components/BottomNavigation/BottomNavigation";
import {LoginScreen} from "./screens/Login/Login";
import CarplayContext from "./store/carplay-context";
import {PaymentsCarView} from "./screens/CarIntegration/Payments";

const Stack = createStackNavigator();


export const App = () => {
  const [carPlayConnected, setCarPlayConnected] = useState(CarPlay.connected);
  const navigationRef = createNavigationContainerRef();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState(null as any);

  function changeSignedInState(signedIn: boolean, loginDetails?: Object) {
    setUser(loginDetails || null);
    setIsSignedIn(signedIn);
  }

  useEffect(() => {

    function onConnect() {
      setCarPlayConnected(true);
    }

    function onDisconnect() {
      setCarPlayConnected(false);
    }

    const emt = new NativeEventEmitter(NativeModules.RNCarPlay);
    emt.addListener('didConnect', () => {
      console.log('CONNECTED!');
    });

    CarPlay.registerOnConnect(onConnect);
    CarPlay.registerOnDisconnect(onDisconnect);

    return () => {
      CarPlay.unregisterOnConnect(onConnect);
      CarPlay.unregisterOnDisconnect(onDisconnect);
    };
  });

  return <CarplayContext.Provider value={{isConnected: carPlayConnected}}>
    {
      carPlayConnected ? (
          <NavigationContainer>
            <Stack.Navigator screenOptions={{
              headerBackground: () =>
              <View style={{flex: 1, backgroundColor: '#F9B341'}}/>,
              backgroundColor: '#F9B341'
            } as any} initialRouteName="Menu">
              <Stack.Screen name="Map" component={Map}/>
              <Stack.Screen name="Menu" component={Menu}/>
              <Stack.Screen name="PaymentsView" component={PaymentsCarView}/>
            </Stack.Navigator>
          </NavigationContainer>
      ) : (
          <View
              style={{
                width: '100%',
                height: '100%',
              }}>
            <NavigationContainer ref={navigationRef}>
              {isSignedIn ? (
                  <>
                    <Stack.Navigator initialRouteName={SCREEN_ROUTES.MERCHANTS}>
                      <Stack.Screen
                          name={SCREEN_ROUTES.MERCHANTS}
                          component={NearbyMerchantsScreen}
                          options={{
                            title: 'Nearby merchants',
                            headerRight: () => (
                                <Button
                                    onPress={() => changeSignedInState(false)}
                                    title="Log out"
                                />
                            ),
                          }}
                      />
                      <Stack.Screen
                          name={SCREEN_ROUTES.PAYMENTS}
                          component={PaymentsScreen}
                          options={{
                            title: 'Payments',
                            headerRight: () => (
                                <Button
                                    onPress={() => changeSignedInState(false)}
                                    title="Log out"
                                />
                            ),
                          }}
                      />
                    </Stack.Navigator>
                    <BottomNavigation nav={navigationRef}/>
                  </>
              ) : (
                  <>
                    <Stack.Navigator>
                      <Stack.Screen name="Login">
                        {props => (
                            <LoginScreen {...props} props={{changeSignedInState}}/>
                        )}
                      </Stack.Screen>
                    </Stack.Navigator>
                  </>
              )}
            </NavigationContainer>
          </View>
      )
    }
  </CarplayContext.Provider>
};
