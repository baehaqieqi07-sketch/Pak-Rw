import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ExternalLink, Image, LoaderCircle, RefreshCcw } from "lucide-react";
import type { LeaderboardPreviewRow } from "../../app/types";
import { api } from "../../lib/api";
import { Button } from "../ui/Button";
import { Card, CardHeader } from "../ui/Card";

export function LeaderboardPreview() {
  const [revision, setRevision] = useState(Date.now());
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState("");
  const [rows, setRows] = useState<LeaderboardPreviewRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");

  const imageUrl = `/api/dashboard/leaderboard/preview.png?ts=${revision}`;

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const result = await api.leaderboardDataPreview();
      setRows(result.rows || []);
    } catch (error) {
      setRows([]);
      setDataError(error instanceof Error ? error.message : String(error));
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const refresh = () => {
    setImageLoading(true);
    setImageError("");
    setRevision(Date.now());
    loadData();
  };

  return (
    <Card className="leaderboard-preview-card full-span-card">
      <CardHeader
        title="Preview & data"
        description="PNG dan ranking dibaca dari data leaderboard aktif. Tidak mengubah poin atau urutan."
        action={<div className="preview-actions"><Button variant="secondary" icon={<RefreshCcw size={15} />} onClick={refresh}>Refresh</Button><Button variant="secondary" icon={<ExternalLink size={15} />} onClick={() => window.open(imageUrl, "_blank", "noopener,noreferrer")}>Buka PNG</Button></div>}
      />

      <div className="leaderboard-preview-layout">
        <div className="leaderboard-image-frame">
          {imageLoading ? <div className="preview-state"><LoaderCircle className="spin" size={24} /><strong>Rendering preview</strong><span>Membaca ranking dan canvas.</span></div> : null}
          {imageError ? <div className="preview-state is-error"><AlertTriangle size={24} /><strong>Preview gagal dimuat</strong><span>{imageError}</span></div> : null}
          <img src={imageUrl} alt="Preview leaderboard Desa Tulus" onLoad={() => setImageLoading(false)} onError={() => { setImageLoading(false); setImageError("Renderer tidak menghasilkan PNG yang dapat ditampilkan."); }} hidden={Boolean(imageError)} />
        </div>

        <div className="leaderboard-data-panel">
          <div className="leaderboard-data-head"><div><strong>Normalized data</strong><span>{rows.length} ranking terbaca</span></div><Image size={18} /></div>
          {dataLoading ? <div className="preview-state compact"><LoaderCircle className="spin" size={20} /><span>Memuat data...</span></div> : null}
          {dataError ? <div className="preview-state compact is-error"><AlertTriangle size={19} /><span>{dataError}</span></div> : null}
          {!dataLoading && !dataError && !rows.length ? <div className="preview-warning"><AlertTriangle size={18} /><span>Leaderboard image preview does not show visible ranking data. Check the data preview and canvas renderer.</span></div> : null}
          {rows.length ? <div className="leaderboard-table-wrap"><table className="leaderboard-data-table"><thead><tr><th>#</th><th>User</th><th>Level</th><th>Points</th><th>Avatar</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.rank}-${row.userId}`}><td>{row.rank}</td><td><strong>{row.displayName}</strong><small>{row.username ? `@${row.username}` : row.userId}</small></td><td>{row.level || "—"}</td><td>{row.points.toLocaleString("id-ID")}</td><td><span className={`avatar-state ${row.avatarReady ? "is-ready" : ""}`}>{row.avatarReady ? "Ready" : "Fallback"}</span></td></tr>)}</tbody></table></div> : null}
          {rows.length ? <details className="raw-data-preview"><summary>Raw normalized data</summary><pre>{JSON.stringify(rows, null, 2)}</pre></details> : null}
        </div>
      </div>
    </Card>
  );
}
