import {Image, StyleSheet, Text, View} from 'react-native';
import React, {useContext, useEffect} from 'react';
import MapView, {Marker, Region} from 'react-native-maps';
import {compareCoordinates} from '../../utils/coordinates';
import {carImageSource} from '../../utils/resources';
import {GetMerchants} from '../../hooks/merchants.hooks';
import {GetLocations} from '../../hooks/locations.hooks';
import {OpenPaymentAlert} from '../../hooks/alert.hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {endpoints} from '../../utils/endpoints';
import {ActionSheetTemplate, CarPlay} from "react-native-carplay";

function NearbyMerchantsScreen({isConnected}: any): JSX.Element {
  const [initialRegion, currentLocation] = GetLocations() as Array<Region>;
  const merchantLocations = GetMerchants();

  async function getUser() {
    return JSON.parse((await AsyncStorage.getItem('user')) as string);
  }

  useEffect(() => {
    const openAlert = async () => {
      const matchedLocation = compareCoordinates(
          currentLocation,
          merchantLocations,
      );
      if (matchedLocation != null) {
        const triggerPayment = async () => {
          const user = await getUser();
          const driverReq = await fetch(
              `${endpoints.base}/${endpoints.operations.driver.path}`,
              {
                method: 'GET',
                headers: {
                  userId: user.id,
                },
              },
          );
          const driver = await driverReq.json();
          const triggerCall = await fetch(
              `${endpoints.base}/${endpoints.operations.trigger.path}/${matchedLocation.id}`,
              {
                method: 'POST',
                headers: {
                  driverID: driver.id,
                },
              },
          );
          if (triggerCall.status === 200) {

            let transactionOpen = false;
            let maximumAlocatedTime = 0;
            const interval = setInterval(() => {
              console.log('polling --->', maximumAlocatedTime);
              maximumAlocatedTime++;
              if(!transactionOpen && maximumAlocatedTime < 20) {
                fetch(
                    `${endpoints.base}/${endpoints.operations.driver.path}/${driver.id}/transactions`,
                ).then(response => {
                  response.json().then(transactions => {
                    const filteredTransactions = transactions.filter(
                        (transaction: any) =>{
                          return transaction.merchant.id === matchedLocation.id && transaction.status === 'OPEN'}
                    )
                    if (filteredTransactions.length > 0) {
                      const transaction = filteredTransactions[filteredTransactions.length - 1];
                      transactionOpen = true
                      const accept = () => {
                        fetch(
                            `${endpoints.base}/${endpoints.operations.payment.confirm}/${transaction.orderId}`,
                            {method: 'POST'},
                        ).then(response => {
                          console.log(response.status);
                        });
                      }
                      const decline = () => {
                        fetch(
                            `${endpoints.base}/${endpoints.operations.payment.decline}/${transaction.orderId}`,
                            {method: 'POST'},
                        ).then(response => {
                          console.log(response.status);
                        });
                      }

                      if(!isConnected) {
                        OpenPaymentAlert(
                            transaction,
                            () => decline(),
                            () => accept(),
                        );
                      } else {
                        const actionSheetTemplate = new ActionSheetTemplate({
                          title:  `Payment to ${transaction.merchant.name}`,
                          message: `Do you accept payment of ${transaction.amount} lei for ${transaction.description}?`,
                          actions: [
                            {
                              id: 'ok',
                              title: 'Accept',
                            },
                            {
                              id: 'remove',
                              title: 'Decline',
                              style: 'destructive',
                            },
                          ],
                          onActionButtonPressed({ id }) {
                            switch (id) {
                              case 'ok':
                                return accept();
                              case 'remove':
                                return decline();
                            }
                          },
                        });

                        CarPlay.presentTemplate(actionSheetTemplate);
                      }

                    }
                  });
                });
              } else {
                clearInterval(interval);
              }
            }, 2000)
          }
        };
        triggerPayment();
      }
    };
    openAlert()
  }, [currentLocation]);

  return (
      <View style={StyleSheet.absoluteFillObject}>
        <MapView
            initialRegion={initialRegion}
            region={currentLocation}
            style={StyleSheet.absoluteFillObject}>
          {currentLocation && (
              <Marker.Animated
                  coordinate={{
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  }}
                  title="Your Location">
                <Image source={carImageSource} style={{height: 35, width: 35}}/>
              </Marker.Animated>
          )}
          {merchantLocations.map((location, index) => (
              <Marker key={index} coordinate={location} title={location.name}>
                  <View style={{width: 50, height:50, backgroundColor: 'red', borderRadius: 50, opacity: 0.3}}></View>
              </Marker>
          ))}
        </MapView>
      </View>
  );
}

export default NearbyMerchantsScreen;
