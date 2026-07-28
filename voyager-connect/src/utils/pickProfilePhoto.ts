import { Platform, Alert, Linking, InteractionManager } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { cropBus } from "@/src/cropBus";

// Pick at full quality (no built-in editor); we do our own interactive crop.
const OPTS = { quality: 1, base64: false } as const;

function settingsAlert(title: string, msg: string) {
  Alert.alert(title, msg, [
    { text: "Cancel", style: "cancel" },
    { text: "Open Settings", onPress: () => Linking.openSettings() },
  ]);
}

async function toCropped(res: ImagePicker.ImagePickerResult): Promise<string | null> {
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  return cropBus.open(a.uri, a.width ?? 1000, a.height ?? 1000);
}

async function fromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) settingsAlert("Photo access is off", "Turn on Photos access in Settings to choose a picture.");
    return null;
  }
  return toCropped(await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], ...OPTS }));
}

async function fromCamera(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) settingsAlert("Camera access is off", "Turn on Camera access in Settings to take a photo.");
    return null;
  }
  // iOS: wait for the chooser Alert / permission dialog to fully dismiss before
  // presenting the camera. Otherwise UIImagePickerController silently fails to
  // present while another controller is still animating away (the library uses
  // PHPickerViewController, which is unaffected — hence only the camera broke).
  await new Promise<void>((r) =>
    InteractionManager.runAfterInteractions(() => setTimeout(r, Platform.OS === "ios" ? 400 : 0)),
  );
  return toCropped(await ImagePicker.launchCameraAsync(OPTS));
}

/**
 * Shows a chooser (Take Photo / Choose from Library) on native, then opens the
 * in-app cropper so the user positions/zooms the photo themselves. Returns a
 * square base64 data URI, or null if cancelled / permission denied. Web goes
 * straight to the library (no camera picker via expo-image-picker on web).
 */
export async function pickProfilePhoto(): Promise<string | null> {
  if (Platform.OS === "web") return fromLibrary();
  return new Promise((resolve) => {
    Alert.alert("Profile photo", "Add a photo so cruise mates can recognize you", [
      { text: "Take Photo", onPress: async () => resolve(await fromCamera()) },
      { text: "Choose from Library", onPress: async () => resolve(await fromLibrary()) },
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]);
  });
}
