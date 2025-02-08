import * as React from "react";
import { FrameNavigationProp } from "react-nativescript-navigation";
import { MainStackParamList } from "../NavigationParamList";
import { supabase } from "../utils/supabase";

type DashboardScreenProps = {
    navigation: FrameNavigationProp<MainStackParamList, "Dashboard">;
};

export function DashboardScreen({ navigation }: DashboardScreenProps) {
    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigation.navigate("Welcome");
    };

    return (
        <flexboxLayout className="h-full flex-col p-8 bg-white">
            <label className="text-2xl font-bold mb-8 text-center text-purple-700">
                Dashboard
            </label>

            <gridLayout rows="auto, auto, auto, auto, auto" columns="*" className="mb-8">
                <button
                    row={0}
                    className="p-4 m-2 rounded-lg bg-purple-100 text-purple-700"
                    onTap={() => navigation.navigate("NewMessage")}
                >
                    New Message
                </button>

                <button
                    row={1}
                    className="p-4 m-2 rounded-lg bg-purple-100 text-purple-700"
                    onTap={() => navigation.navigate("Inbox")}
                >
                    Inbox
                </button>

                <button
                    row={2}
                    className="p-4 m-2 rounded-lg bg-purple-100 text-purple-700"
                    onTap={() => navigation.navigate("SentMessages")}
                >
                    Sent Messages
                </button>

                <button
                    row={3}
                    className="p-4 m-2 rounded-lg bg-purple-100 text-purple-700"
                    onTap={() => navigation.navigate("SavedMemories")}
                >
                    Saved Memories
                </button>

                <button
                    row={4}
                    className="p-4 m-2 rounded-lg bg-purple-100 text-purple-700"
                    onTap={() => navigation.navigate("Settings")}
                >
                    Settings
                </button>
            </gridLayout>

            <button
                className="p-4 rounded-full border-2 border-purple-600 text-purple-600"
                onTap={handleLogout}
            >
                Log Out
            </button>
        </flexboxLayout>
    );
}