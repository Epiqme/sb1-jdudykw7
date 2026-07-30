// Default (web + Android) implementation.
// On these platforms the $59 Elite unlock uses Stripe, so this renders nothing.
// The real StoreKit flow lives in EliteApplePayButton.ios.tsx, which keeps
// `expo-iap` (a native-only module) out of the web/Android bundles.
export type EliteApplePayButtonProps = {
  profileId: string;
  cruiseId: string;
  confirmationNumber?: string;
  onUnlocked: () => void;
  setMsg: (s: string) => void;
};

export default function EliteApplePayButton(_props: EliteApplePayButtonProps) {
  return null;
}
