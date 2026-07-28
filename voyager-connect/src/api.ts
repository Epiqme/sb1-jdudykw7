const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

async function req(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${res.status}: ${txt}`);
  }
  return res.json();
}

export type Cruise = {
  id: string;
  ship: string;
  port: string;
  region: string;
  sail_date: string;
  nights: number;
  itinerary: string[];
  image: string;
  member_count: number;
};

export type Profile = {
  id: string;
  name: string;
  age?: number;
  home_town?: string;
  cruise_id: string;
  is_single: boolean;
  bio: string;
  photo: string;
  cover_image?: string;
  vibe: string;
  waves_received: number;
};

export type Message = {
  id: string;
  cruise_id: string;
  profile_id: string;
  name: string;
  text: string;
  image?: string;
  created_at: string;
};

export type DMMessage = {
  id: string;
  conversation_id: string;
  from_id: string;
  to_id: string;
  from_name: string;
  text: string;
  image?: string;
  created_at: string;
  read: boolean;
};

export type DMConversation = {
  partner_id: string;
  partner_name: string;
  partner_photo: string;
  last_text: string;
  last_at: string;
  unread: number;
};

export type Deal = {
  id: string;
  title: string;
  ship: string;
  region: string;
  nights: number;
  base_price: number;
  deal_price: number;
  perks: string[];
  image: string;
  tag: string;
};

export const api = {
  cruises: (region?: string): Promise<Cruise[]> =>
    req(`/cruises${region && region !== "All" ? `?region=${encodeURIComponent(region)}` : ""}`),
  cruise: (id: string): Promise<Cruise> => req(`/cruises/${id}`),
  createProfile: (body: any): Promise<Profile> =>
    req(`/profiles`, { method: "POST", body: JSON.stringify(body) }),
  getProfile: (id: string): Promise<Profile> => req(`/profiles/${id}`),
  updateProfile: (id: string, body: any): Promise<Profile> =>
    req(`/profiles/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProfile: (id: string): Promise<{ deleted: boolean }> =>
    req(`/profiles/${id}`, { method: "DELETE" }),
  members: (cruiseId: string, singlesOnly = false, profileId?: string): Promise<Profile[]> =>
    req(`/cruises/${cruiseId}/members?singles_only=${singlesOnly}${profileId ? `&profile_id=${profileId}` : ""}`),
  communityMembers: (singlesOnly = false): Promise<Profile[]> =>
    req(`/community/members?singles_only=${singlesOnly}`),
  wave: (id: string): Promise<Profile> => req(`/profiles/${id}/wave`, { method: "POST" }),
  messages: (cruiseId: string, profileId?: string): Promise<Message[]> =>
    req(`/cruises/${cruiseId}/messages${profileId ? `?profile_id=${profileId}` : ""}`),
  sendMessage: (cruiseId: string, body: any): Promise<Message> =>
    req(`/cruises/${cruiseId}/messages`, { method: "POST", body: JSON.stringify(body) }),
  dmConversations: (me: string): Promise<DMConversation[]> =>
    req(`/dm/conversations?me=${me}`),
  dmThread: (me: string, other: string): Promise<DMMessage[]> =>
    req(`/dm/thread?me=${me}&other=${other}`),
  dmSend: (body: { from_id: string; to_id: string; text?: string; image?: string }): Promise<DMMessage> =>
    req(`/dm/send`, { method: "POST", body: JSON.stringify(body) }),
  deals: (): Promise<Deal[]> => req(`/deals`),
  dealScan: (body: any): Promise<any> =>
    req(`/deal-scan`, { method: "POST", body: JSON.stringify(body) }),
  bookingLinks: (): Promise<{ fora_url: string; firstmates_url: string; agent_name: string; tagline: string }> =>
    req(`/booking-links`),
  createCheckout: (body: { profile_id: string; cruise_id: string; origin: string; confirmation_number?: string }): Promise<{ id: string; url: string }> =>
    req(`/checkout/create-session`, { method: "POST", body: JSON.stringify(body) }),
  verifyCheckout: (session_id: string): Promise<{ unlocked: boolean; payment_status: string }> =>
    req(`/checkout/verify`, { method: "POST", body: JSON.stringify({ session_id }) }),
  appleVerify: (body: { profile_id: string; cruise_id: string; purchase_token: string; confirmation_number?: string }): Promise<{ unlocked: boolean; cruise_id: string; transaction_id?: string }> =>
    req(`/iap/apple/verify`, { method: "POST", body: JSON.stringify(body) }),
  appleRestore: (body: { profile_id: string; purchase_tokens: string[] }): Promise<{ unlocked: boolean; cruise_id?: string; transaction_id?: string }> =>
    req(`/iap/apple/restore`, { method: "POST", body: JSON.stringify(body) }),
  eliteStatus: (profile_id: string): Promise<{ unlocked: boolean; method?: string; cruise_id?: string }> =>
    req(`/elite/status/${profile_id}`),
  eliteConfirm: (body: { profile_id: string; confirmation_number: string }): Promise<{ unlocked: boolean; cruise_id: string }> =>
    req(`/elite/confirm`, { method: "POST", body: JSON.stringify(body) }),
  resolveConfirmation: (confirmation_number: string): Promise<{ valid: boolean; reason?: string; cruise?: Cruise }> =>
    req(`/confirmations/resolve`, { method: "POST", body: JSON.stringify({ confirmation_number }) }),
  adminCreateConfirmation: (pin: string, body: { confirmation_number: string; cruise_id: string }): Promise<any> =>
    req(`/admin/confirmations`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin }, body: JSON.stringify(body) }),
  adminBulkConfirmations: (pin: string, body: { numbers: string; cruise_id: string }): Promise<{ added: number; skipped: number; total: number }> =>
    req(`/admin/confirmations/bulk`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin }, body: JSON.stringify(body) }),
  adminListConfirmations: (pin: string): Promise<any[]> =>
    req(`/admin/confirmations`, { headers: { "Content-Type": "application/json", "X-Admin-Pin": pin } }),
  adminDeleteConfirmation: (pin: string, number: string): Promise<any> =>
    req(`/admin/confirmations/${encodeURIComponent(number)}`, { method: "DELETE", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin } }),
  adminVerify: (pin: string): Promise<{ ok: boolean }> =>
    req(`/admin/verify`, { method: "POST", body: JSON.stringify({ pin }) }),
  adminCreateCruise: (pin: string, body: any): Promise<Cruise> =>
    req(`/admin/cruises`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin }, body: JSON.stringify(body) }),
  adminUpdateCruise: (pin: string, id: string, body: any): Promise<Cruise> =>
    req(`/admin/cruises/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin }, body: JSON.stringify(body) }),
  adminDeleteCruise: (pin: string, id: string): Promise<any> =>
    req(`/admin/cruises/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin } }),
  adminCreateDeal: (pin: string, body: any): Promise<Deal> =>
    req(`/admin/deals`, { method: "POST", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin }, body: JSON.stringify(body) }),
  adminUpdateDeal: (pin: string, id: string, body: any): Promise<Deal> =>
    req(`/admin/deals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin }, body: JSON.stringify(body) }),
  adminDeleteDeal: (pin: string, id: string): Promise<any> =>
    req(`/admin/deals/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json", "X-Admin-Pin": pin } }),
};

export const BACKEND_URL = BASE;

export const STORAGE_KEYS = {
  profileId: "icebreaker_profile_id",
  cruiseId: "icebreaker_cruise_id",
  unlockPrefix: "icebreaker_unlocked_",
};
