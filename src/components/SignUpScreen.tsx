import * as React from "react";
import { alert } from "@nativescript/core";
import { FrameNavigationProp } from "react-nativescript-navigation";
import { MainStackParamList } from "../NavigationParamList";
import { supabase } from "../utils/supabase";

type SignUpScreenProps = {
    navigation: FrameNavigationProp<MainStackParamList, "SignUp">;
};

export function SignUpScreen({ navigation }: SignUpScreenProps) {
    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [displayName, setDisplayName] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    const handleSignUp = async () => {
        if (!email || !password || !displayName) {
            alert({
                title: "Error",
                message: "Please fill in all fields",
                okButtonText: "OK"
            });
            return;
        }

        try {
            setLoading(true);
            
            // Sign up the user
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName
                    }
                }
            });

            if (signUpError) throw signUpError;

            alert({
                title: "Success",
                message: "Account created successfully! Please log in.",
                okButtonText: "OK"
            }).then(() => {
                navigation.navigate("Login");
            });

        } catch (error) {
            alert({
                title: "Error",
                message: error.message || "An error occurred during sign up",
                okButtonText: "OK"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <flexboxLayout className="h-full flex-col p-8 bg-white">
            <label className="text-2xl font-bold mb-8 text-center text-purple-700">
                Create Account
            </label>

            <textField
                className="p-4 mb-4 rounded border border-gray-300"
                hint="Display Name"
                text={displayName}
                editable={!loading}
                onTextChange={(args) => setDisplayName(args.object.text)}
            />

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
                onTap={handleSignUp}
                isEnabled={!loading}
            >
                {loading ? "Creating Account..." : "Create Account"}
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