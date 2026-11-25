import { KLEF_LOGO_BASE64 } from "./logoBase64";

export default function Brand({ compact = false }) {
  return (
    <div className="brand">
      <img
        className="brand-logo"
        src={KLEF_LOGO_BASE64}
        alt="KLEF university logo"
        onError={(e) => {
          if (e.currentTarget.src !== "/assets/klef-logo.png") {
            e.currentTarget.src = "/assets/klef-logo.png";
          }
        }}
      />
      <div>
        <strong>Koneru Lakshmaiah Education Foundation</strong>
        {!compact && <span>Deemed to be University</span>}
      </div>
    </div>
  );
}
