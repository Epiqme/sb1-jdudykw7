import { Share } from "react-native";
import { Cruise } from "@/src/api";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

function fmt(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function shareInvite(cruise: Cruise, myName?: string) {
  const link = `${BASE}/join/${cruise.id}`;
  const who = myName ? `${myName} is` : "I'm";
  const message =
    `${who} sailing on the ${cruise.ship} — ${fmt(cruise.sail_date)} from ${cruise.port}! 🚢\n\n` +
    `Join the Icebreaker to see who else is aboard and meet your crew before we board.\n\n${link}`;
  try {
    await Share.share({ message, url: link, title: "Join my Icebreaker cruise group" });
    return true;
  } catch {
    return false;
  }
}
