import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ value, onChange, placeholder = "Enter password", ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          cursor: "pointer",
          padding: "4px 6px",
          borderRadius: "4px",
          transition: "opacity 0.15s ease",
        }}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        <span>{visible ? "Hide" : "Show"}</span>
      </button>
    </div>
  );
}
