import * as React from "react";
import { alert } from "@nativescript/core";
import { FrameNavigationProp } from "react-nativescript-navigation";
import { MainStackParamList } from "../NavigationParamList";
import { supabase } from "../utils/supabase";

type LoginScreenProps = {
    navigation: FrameNavigationProp<MainStackParamList, "Login">;
};

export function LoginScreen({ navigation }: LoginScreenProps) {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            alert({
                title: "Error",
                message: "Please enter both email and password",
                okButtonText: "OK"
            });
            return;
        }

        try {
            setLoading(true);
            
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Navigate to Dashboard on successful login
            navigation.navigate("Dashboard");

        } catch (error) {
            alert({
                title: "Error",
                message: error.message || "An error occurred during login",
                okButtonText: "OK"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <flexboxLayout className="h-full flex-col p-8 bg-white">
            <label className="text-2xl font-bold mb-8 text-center text-purple-700">
                Welcome Back
            </label>

            <textField
                className="p-4 mb-4 rounded border border-gray-300"
                hint="Email"
                keyboardType="email"
                text={email}
                editable={!loading}
                onTextChange={(args) => setEmail(args.object.text)}
            />

            <textField
                className="p-4 mb-8 rounded border border-gray-300"
                hint="Password"
                secure={true}
                text={password}
                editable={!loading}
                onTextChange={(args) => setPassword(args.object.text)}
            />

            <button
                className={`p-4 mb-4 rounded-full ${loading ? 'bg-purple-400' : 'bg-purple-600'} text-white text-lg font-semibold`}
                onTap={handleLogin}
                isEnabled={!loading}
            >
                {loading ? "Logging in..." : "Log In"}
            </button>

            <button
                className="text-purple-600"
                onTap={() => navigation.goBack()}
                isEnabled={!loading}
            >
                Back to Welcome
            </button>
        </flexboxLayout>
    );
}