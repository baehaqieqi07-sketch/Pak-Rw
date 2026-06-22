export type DiscordChannel = {
  id: string;
  name: string;
  type?: number | string;
  typeLabel?: string;
  meta?: string;
  category?: string;
  rawName?: string;
  mention?: string;
  permissionStatus?: { view: boolean; send: boolean; embed: boolean; attach: boolean; history: boolean } | null;
};

export type DiscordRole = {
  id: string;
  name: string;
  color?: string;
  position?: number;
  managed?: boolean;
  rawName?: string;
  mention?: string;
  aboveBot?: boolean;
  sensitivePermissions?: string[];
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
  pingMs: number | null;
  lastConfigSaveAt: string | null;
  lastBackupAt: string | null;
  dashboardBuildReady: boolean;
  assetFoldersReady: boolean;
};

export type DashboardHealth = {
  ok: boolean;
  botOnline: boolean;
  databaseMode: string;
  dashboardBuild: boolean;
  dashboardEnabled: boolean;
  uptimeSeconds: number;
  pingMs: number | null;
  configReadable: boolean;
  assetFoldersReady: boolean;
  ai?: AiDashboardStatus;
  checkedAt: string;
};

export type AiDashboardStatus = {
  enabled: boolean;
  providerName: string;
  baseUrl: string;
  apiKeyConfigured: boolean;
  smartModel: string;
  economyModel: string;
  limit: { status?: string; reason?: string; retryAfterAt?: number | null; modelActive?: string };
  memory: { users: number; summaries: number; recentTurns: number; enabled: boolean; anonymousMemory: boolean };
  budget: { tokenBudget: number; maxReplyTokens: number; safeReplyTokens: number; cooldownUserSeconds: number; dailyLimitPerUser: number; cacheEnabled: boolean; cacheTtlMs: number };
};

export type LeaderboardPreviewRow = {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  points: number;
  level: number;
  avatarUrl: string;
  avatarReady: boolean;
};

export type BootstrapData = {
  ok: boolean;
  status: DashboardStatus;
  guild: { id: string; name: string; memberCount: number } | null;
  config: Record<string, any>;
  embeds: Record<string, any>;
  features: Record<string, boolean>;
  levelRoleTiers: Array<{ level: number; name: string; roleName?: string; roleId?: string }>;
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
