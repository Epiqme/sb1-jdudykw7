import { BaseNavigationContainer } from '@react-navigation/core';
import * as React from "react";
import { stackNavigatorFactory } from "react-nativescript-navigation";

import { WelcomeScreen } from "./WelcomeScreen";
import { SignUpScreen } from "./SignUpScreen";
import { LoginScreen } from "./LoginScreen";
import { DashboardScreen } from "./DashboardScreen";

const StackNavigator = stackNavigatorFactory();

export const MainStack = () => (
    <BaseNavigationContainer>
        <StackNavigator.Navigator
            initialRouteName="Welcome"
            screenOptions={{
                headerShown: false
            }}
        >
            <StackNavigator.Screen
                name="Welcome"
                component={WelcomeScreen}
            />
            <StackNavigator.Screen
                name="SignUp"
                component={SignUpScreen}
            />
            <StackNavigator.Screen
                name="Login"
                component={LoginScreen}
            />
            <StackNavigator.Screen
                name="Dashboard"
                component={DashboardScreen}
            />
        </StackNavigator.Navigator>
    </BaseNavigationContainer>
);