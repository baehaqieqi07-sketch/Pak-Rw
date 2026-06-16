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
  "{multiplier}": "1,5x",
  "{duration}": "3 hari",
  "{channels}": "#chat-warga, #ruang-mabar",
  "{endsAt}": "19 Juni 2026 23.59 WIB",
  "{by}": "Pak RW",
  "{status}": "Aktif",
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

export function resolvePreviewText(input = "", picker?: PickerData) {
  let output = input;
  const replacements = { ...placeholderSample, ...roleTokens };
  Object.entries(replacements).forEach(([token, value]) => { output = output.split(token).join(value); });
  Object.entries(channelTokens).forEach(([token, fallback]) => {
    const channel = picker?.channel?.find((item) => item.name.toLowerCase().includes(fallback.replaceAll("-", " ")) || item.name === fallback);
    output = output.split(token).join(`#${channel?.name || fallback}`);
  });
  return output;
}

function renderLines(text: string) {
  return text.split("\n").map((line, index) => <span key={index}>{line || "\u00a0"}{index < text.split("\n").length - 1 ? <br /> : null}</span>);
}

export function DiscordPreview({ embed, picker }: { embed: EmbedDraft; picker?: PickerData }) {
  const color = embed.color || "#88a08c";
  return (
    <div className="discord-preview-shell">
      <div className="discord-preview-toolbar"><span>Discord preview</span><small>Renderer dashboard</small></div>
      <div className="discord-message">
        <div className="discord-avatar"><img src="/dashboard/pak-rw-mark.svg" alt="Pak RW" /></div>
        <div className="discord-message-body">
          <div className="discord-author-line"><strong>Pak RW</strong><span>APP</span><time>hari ini pukul 17.10</time></div>
          {embed.content ? <div className="discord-content">{renderLines(resolvePreviewText(embed.content, picker))}</div> : null}
          <div className="discord-embed" style={{ borderLeftColor: color }}>
            {embed.authorName ? <div className="discord-embed-author">{embed.authorIcon ? <img src={embed.authorIcon} alt="" /> : null}<strong>{resolvePreviewText(embed.authorName, picker)}</strong></div> : null}
            {embed.thumbnailUrl ? <img className="discord-thumbnail" src={embed.thumbnailUrl} alt="Thumbnail embed" /> : null}
            <div className="discord-embed-main">
              {embed.title ? <div className="discord-embed-title">{resolvePreviewText(embed.title, picker)}</div> : null}
              {embed.description ? <div className="discord-embed-description">{renderLines(resolvePreviewText(embed.description, picker))}</div> : null}
              {embed.fields?.length ? <div className="discord-fields">{embed.fields.map((field, index) => <div className={field.inline ? "is-inline" : ""} key={index}><strong>{resolvePreviewText(field.name, picker)}</strong><span>{renderLines(resolvePreviewText(field.value, picker))}</span></div>)}</div> : null}
              {embed.imageUrl ? <img className="discord-image" src={embed.imageUrl} alt="Gambar embed" /> : null}
              {(embed.footerText || embed.timestamp) ? <div className="discord-footer">{embed.footerIcon ? <img src={embed.footerIcon} alt="" /> : null}<span>{resolvePreviewText(embed.footerText || "", picker)}{embed.footerText && embed.timestamp ? " · " : ""}{embed.timestamp ? "Hari ini pukul 17.10" : ""}</span></div> : null}
            </div>
          </div>
          {embed.buttons?.length ? <div className="discord-buttons">{embed.buttons.map((button, index) => <button key={index}>{button.label || "Button"}{button.url ? <ExternalLink size={14} /> : null}</button>)}</div> : null}
        </div>
      </div>
    </div>
  );
}
