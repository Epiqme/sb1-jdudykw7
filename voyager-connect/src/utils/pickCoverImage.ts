import { Platform, Alert, Linking, InteractionManager } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

function settingsAlert(title: string, msg: string) {
  Alert.alert(title, msg, [
    { text: "Cancel", style: "cancel" },
    { text: "Open Settings", onPress: () => Linking.openSettings() },
  ]);
}

async function compress(uri: string): Promise<string | null> {
  try {
    const out = await manipulateAsync(uri, [{ resize: { width: 1280 } }], {
      format: SaveFormat.JPEG,
      compress: 0.6,
      base64: true,
    });
    return out.base64 ? `data:image/jpeg;base64,${out.base64}` : null;
  } catch {
    return null;
  }
}

async function handle(res: ImagePicker.ImagePickerResult): Promise<string | null> {
  if (res.canceled || !res.assets[0]) return null;
  return compress(res.assets[0].uri);
}

async function fromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) settingsAlert("Photo access is off", "Turn on Photos access in Settings to choose a picture.");
    return null;
  }
  return handle(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 }));
}

async function fromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) settingsAlert("Camera access is off", "Turn on Camera access in Settings to take a photo.");
    return null;
  }
  // iOS: wait for the chooser Alert / permission dialog to fully dismiss before
  // presenting the camera, otherwise the capture preview can present as black.
  await new Promise<void>((r) =>
    InteractionManager.runAfterInteractions(() => setTimeout(r, Platform.OS === "ios" ? 400 : 0)),
  );
  return handle(await ImagePicker.launchCameraAsync({ quality: 1 }));
}

/**
 * Take-or-upload chooser for the profile cover/background image. Returns a
 * compressed JPEG base64 data URI (kept wide, not cropped), or null if
 * cancelled / denied. Web goes straight to the library.
 */
export async function pickCoverImage(): Promise<string | null> {
  if (Platform.OS === "web") return fromLibrary();
  return new Promise((resolve) => {
    Alert.alert("Cover photo", "Set a background image for your profile", [
      { text: "Take Photo", onPress: async () => resolve(await fromCamera()) },
      { text: "Choose from Library", onPress: async () => resolve(await fromLibrary()) },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}
