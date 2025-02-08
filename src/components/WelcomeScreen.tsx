import * as React from "react";
import { StyleSheet } from "react-nativescript";
import { FrameNavigationProp } from "react-nativescript-navigation";
import { MainStackParamList } from "../NavigationParamList";

type WelcomeScreenProps = {
    navigation: FrameNavigationProp<MainStackParamList, "Welcome">;
};

export function WelcomeScreen({ navigation }: WelcomeScreenProps) {
    return (
        <flexboxLayout className="h-full flex-col justify-center items-center p-8 bg-white">
            <label className="text-3xl font-bold mb-8 text-center text-purple-700">
                Remember When
            </label>
            
            <label className="text-lg mb-8 text-center text-gray-600">
                Share meaningful moments with your loved ones
            </label>

            <button
                className="w-64 p-4 mb-4 rounded-full bg-purple-600 text-white text-lg font-semibold"
                onTap={() => navigation.navigate("SignUp")}
            >
                Sign Up
            </button>

            <button
                className="w-64 p-4 rounded-full border-2 border-purple-600 text-purple-600 text-lg font-semibold"
                onTap={() => navigation.navigate("Login")}
            >
                Log In
            </button>
        </flexboxLayout>
    );
}