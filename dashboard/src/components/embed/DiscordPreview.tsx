import { ExternalLink } from "lucide-react";
import type { EmbedDraft, PickerData } from "../../app/types";

const placeholderSample: Record<string, string> = {
  "{user}": "@Warga Baru",
  "{userId}": "1515687506639585434",
  "{username}": "warga_baru",
  "{displayName}": "Warga Baru",
  "{avatar}": "https://cdn.discordapp.com/embed/avatars/0.png",
  "{joinedAt}": "16 Juni 2026",
  "{server}": "DESA TULUS",
  "{serverName}": "DESA TULUS",
  "{memberCount}": "224",
  "{ownerName}": "Pak RW",
  "{botName}": "Pak RW",
  "{prefix}": "rw",
  "{level}": "12",
  "{rank}": "8",
  "{total}": "18.540",
  "{chat}": "12.480",
  "{voice}": "6.060",
  "{lifetimeTotal}": "118.540",
  "{cyclePoints}": "18.540",
  "{motmThreshold}": "100.000",
  "{nextLevel}": "13",
  "{remainingPoints}": "1.460",
  "{eventName}": "Pekan Guyub Warga",
  "{multiplier}": "x10",
  "{duration}": "60",
  "{channels}": "#chat-warga, #ruang-mabar",
  "{endsAt}": "19 Juni 2026 23.59 WIB",
  "{by}": "Pak RW",
  "{status}": "Aktif",
  "{bonusPercent}": "15",
  "{month}": "Juni",
  "{year}": "2026",
  "{date}": "16 Juni 2026",
  "{time}": "17.10 WIB",
  "{today}": "Selasa, 16 Juni 2026",
  "{now}": "16 Juni 2026 17.10 WIB"
};

const channelTokens: Record<string, string> = {
  "{rulesChannel}": "aturan-desa",
  "{chatWargaChannel}": "chat-warga",
  "{ticketChannel}": "ticket",
  "{aiChannel}": "tanya-pak-rw",
  "{curhatChannel}": "ruang-curhat",
  "{anonymousCurhatChannel}": "curhat-anonim",
  "{suggestionChannel}": "kotak-saran",
  "{levelChannel}": "level-warga",
  "{cekPoinChannel}": "cek-poin",
  "{topActiveChannel}": "top-aktif",
  "{leaderboardChannel}": "leaderboard-aktif",
  "{mabarChannel}": "cari-mabar",
  "{boostPoinChannel}": "boost-poin",
  "{vipVoiceChannel}": "voice-vip",
  "{juraganChatChannel}": "chat-juragan",
  "{welcomeChannel}": "chat-warga"
};

const roleTokens: Record<string, string> = {
  "{memberRole}": "@Warga",
  "{memberTulusRole}": "@Member Tulus",
  "{staffRole}": "@Staff Desa",
  "{adminRole}": "@Admin Desa",
  "{moderatorRole}": "@Moderator",
  "{motmRole}": "@Member Of The Month",
  "{donaturRole}": "@Donatur Desa",
  "{juraganRole}": "@Juragan Desa"
};

const knownEmojiShortcodes: Record<string, string> = {
  rocket_animated: "<a:rocket_animated:1512884173453529288>",
  bar_chart: "<a:bar_chart:1516453838117277829>",
  Chart_Increasing: "<a:Chart_Increasing:1516454160684290219>",
  Animated_Arrow_Bluelite: "<a:Animated_Arrow_Bluelite:1512751559140839576>",
  Desa_Tulus: "<a:Desa_Tulus:1516424353934348299>"
};

function normalizeKnownEmojiShortcodes(input = "") {
  let output = input;
  Object.entries(knownEmojiShortcodes).forEach(([name, markup]) => {
    output = output.replace(new RegExp(`:${name}:(?!\\d)`, "g"), markup);
  });
  return output;
}

export function resolvePreviewText(input = "", picker?: PickerData) {
  let output = normalizeKnownEmojiShortcodes(input);
  const replacements = { ...placeholderSample, ...roleTokens };
  Object.entries(replacements).forEach(([token, value]) => { output = output.split(token).join(value); });
  Object.entries(channelTokens).forEach(([token, fallback]) => {
    const channel = picker?.channel?.find((item) => `${item.name} ${item.rawName || ""}`.toLowerCase().includes(fallback.replaceAll("-", " ")) || cleanName(item.name) === fallback);
    output = output.split(token).join(`#${cleanName(channel?.rawName || channel?.name || fallback)}`);
  });
  return output;
}

function cleanName(name = "") { return String(name || "").replace(/^[@#]/, "").trim(); }

function resolveMentionLabel(part: string, picker?: PickerData) {
  const user = part.match(/^<@!?(\d+)>$/);
  if (user) {
    const found = picker?.user?.find((item) => item.id === user[1]);
    return `@${found?.displayName || found?.username || found?.name || user[1]}`;
  }
  const role = part.match(/^<@&(\d+)>$/);
  if (role) {
    const found = picker?.role?.find((item) => item.id === role[1]);
    return `@${cleanName(found?.rawName || found?.name || role[1])}`;
  }
  const channel = part.match(/^<#(\d+)>$/);
  if (channel) {
    const found = picker?.channel?.find((item) => item.id === channel[1]);
    return `#${cleanName(found?.rawName || found?.name || channel[1])}`;
  }
  return part;
}

function renderInline(text: string, picker?: PickerData) {
  const pattern = /(<a?:[A-Za-z0-9_]+:\d+>|<@!?\d+>|<@&\d+>|<#\d+>)/g;
  return text.split(pattern).filter(Boolean).map((part, index) => {
    const emoji = part.match(/^<(a?):([A-Za-z0-9_]+):(\d+)>$/);
    if (emoji) {
      const animated = emoji[1] === "a";
      return <img key={`${part}-${index}`} className="discord-custom-emoji" src={`https://cdn.discordapp.com/emojis/${emoji[3]}.${animated ? "gif" : "webp"}?size=48&quality=lossless`} alt={`:${emoji[2]}:`} title={`:${emoji[2]}:`} />;
    }
    if (/^<@!?\d+>$/.test(part) || /^<@&\d+>$/.test(part) || /^<#\d+>$/.test(part)) return <span key={`${part}-${index}`} className="discord-mention">{resolveMentionLabel(part, picker)}</span>;
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function renderPlainLines(lines: string[], picker?: PickerData) {
  return lines.map((line, index) => <span key={index}>{line ? renderInline(line, picker) : "\u00a0"}{index < lines.length - 1 ? <br /> : null}</span>);
}

function renderLines(text: string, picker?: PickerData) {
  const lines = text.split("\n");
  if (lines[0]?.startsWith(">>> ")) {
    const quoted = [lines[0].slice(4), ...lines.slice(1)];
    return <span className="discord-blockquote-multiline">{renderPlainLines(quoted, picker)}</span>;
  }
  return renderPlainLines(lines, picker);
}

export function DiscordPreview({ embed, picker }: { embed: EmbedDraft; picker?: PickerData }) {
  const color = embed.color || "#7DBD77";
  return (
    <div className="discord-preview-shell">
      <div className="discord-preview-toolbar"><span>Discord preview</span><small>Renderer dashboard</small></div>
      <div className="discord-message">
        <div className="discord-avatar"><img src="/dashboard/pak-rw-mark.svg" alt="Pak RW" /></div>
        <div className="discord-message-body">
          <div className="discord-author-line"><strong>Pak RW</strong><span>APP</span><time>hari ini pukul 17.10</time></div>
          {embed.content ? <div className="discord-content">{renderLines(resolvePreviewText(embed.content, picker), picker)}</div> : null}
          <div className="discord-embed" style={{ borderLeftColor: color }}>
            {embed.authorName ? <div className="discord-embed-author">{embed.authorIcon ? <img src={embed.authorIcon} alt="" /> : null}<strong>{renderInline(resolvePreviewText(embed.authorName, picker), picker)}</strong></div> : null}
            {embed.thumbnailUrl ? <img className="discord-thumbnail" src={embed.thumbnailUrl} alt="Thumbnail embed" /> : null}
            <div className="discord-embed-main">
              {embed.title ? <div className="discord-embed-title">{renderInline(resolvePreviewText(embed.title, picker), picker)}</div> : null}
              {embed.description ? <div className="discord-embed-description">{renderLines(resolvePreviewText(embed.description, picker), picker)}</div> : null}
              {embed.fields?.length ? <div className="discord-fields">{embed.fields.map((field, index) => <div className={field.inline ? "is-inline" : ""} key={index}><strong>{renderInline(resolvePreviewText(field.name, picker), picker)}</strong><span>{renderLines(resolvePreviewText(field.value, picker), picker)}</span></div>)}</div> : null}
              {embed.imageUrl ? <img className="discord-image" src={embed.imageUrl} alt="Gambar embed" /> : null}
              {(embed.footerText || embed.timestamp) ? <div className="discord-footer">{embed.footerIcon ? <img src={embed.footerIcon} alt="" /> : null}<span>{renderInline(resolvePreviewText(embed.footerText || "", picker), picker)}{embed.footerText && embed.timestamp ? " · " : ""}{embed.timestamp ? "Hari ini pukul 17.10" : ""}</span></div> : null}
            </div>
          </div>
          {embed.buttons?.length ? <div className="discord-buttons">{embed.buttons.map((button, index) => <button key={index}>{button.label || "Button"}{button.url ? <ExternalLink size={14} /> : null}</button>)}</div> : null}
        </div>
      </div>
    </div>
  );
}
