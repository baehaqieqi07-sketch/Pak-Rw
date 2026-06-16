export type DiscordChannel = {
  id: string;
  name: string;
  type?: number | string;
  typeLabel?: string;
  meta?: string;
  category?: string;
  rawName?: string;
  mention?: string;
};

export type DiscordRole = {
  id: string;
  name: string;
  color?: string;
  position?: number;
  managed?: boolean;
  rawName?: string;
  mention?: string;
};

export type DiscordUser = {
  id: string;
  username: string;
  name?: string;
  rawName?: string;
  displayName?: string;
  avatarUrl?: string;
  bot?: boolean;
  mention?: string;
};

export type PickerData = {
  ok: boolean;
  ready?: boolean;
  error?: string;
  guild?: { id: string; name: string; memberCount: number };
  counts?: { channels: number; roles: number; users: number };
  channel: DiscordChannel[];
  role: DiscordRole[];
  user: DiscordUser[];
};

export type DashboardStatus = {
  botOnline: boolean;
  botTag: string | null;
  databaseMode: string;
  uptimeSeconds: number;
  dashboardEnabled: boolean;
  activeFeatureCount: number;
  totalFeatureCount: number;
  version: string;
  prefix: string;
  environment: string;
};

export type BootstrapData = {
  ok: boolean;
  status: DashboardStatus;
  guild: { id: string; name: string; memberCount: number } | null;
  config: Record<string, any>;
  embeds: Record<string, any>;
  features: Record<string, boolean>;
  activity: Array<{ at: string; title: string; detail?: string; type?: string }>;
};

export type EmbedDraft = {
  content?: string;
  authorName?: string;
  authorIcon?: string;
  title?: string;
  description?: string;
  color?: string;
  thumbnailUrl?: string;
  imageUrl?: string;
  footerText?: string;
  footerIcon?: string;
  timestamp?: boolean;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  buttons?: Array<{ label: string; url?: string; style?: string }>;
};
