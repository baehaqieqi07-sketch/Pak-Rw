export function VillageBackdrop() {
  return (
    <div className="village-backdrop" aria-hidden="true">
      <div className="village-image" />
      <div className="village-overlay" />
      <div className="village-contours"><i /><i /><i /><i /></div>
      <div className="village-horizon"><span /><span /><span /></div>
      <div className="village-fog village-fog-one" />
      <div className="village-fog village-fog-two" />
      <div className="village-grain" />
    </div>
  );
}
