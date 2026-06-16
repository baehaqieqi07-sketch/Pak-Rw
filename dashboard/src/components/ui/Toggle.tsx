export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) {
  return (
    <label className="toggle-wrap">
      {label ? <span>{label}</span> : null}
      <button type="button" className={`toggle ${checked ? "is-on" : ""}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  );
}
