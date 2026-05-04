import { useState } from "react";
import { Phone, Lock, Eye, EyeOff, Loader, X, ChevronLeft } from "lucide-react";
import api from "../api";

const GOLD = "linear-gradient(to bottom, #D4AF37 0%, #F9E08B 50%, #B8860B 100%)";

const inp = (focused) => ({
  width: "100%",
  padding: "13px 16px 13px 46px",
  background: "#1A1A1A",
  border: `1.5px solid ${focused ? "#F9E08B" : "#262626"}`,
  borderRadius: 10,
  fontSize: 15,
  color: "#fff",
  outline: "none",
  boxSizing: "border-box",
  transition: "border 0.2s",
});

function ForgotModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const sendCode = async () => {
    setError(""); setMsg("");
    if (!email) { setError("Enter your email"); return; }
    setLoading(true);
    try {
      await api.forgotPasswordRequest(email);
      setMsg("Reset code sent! Check your email.");
      setStep(2);
    } catch (e) { setError(e?.message || "Failed to send code"); }
    finally { setLoading(false); }
  };

  const confirmReset = async () => {
    setError(""); setMsg("");
    if (code.length !== 6) { setError("Enter the 6-digit code"); return; }
    if (!/^\d{6}$/.test(pwd)) { setError("New PIN must be exactly 6 digits"); return; }
    if (pwd !== confirm) { setError("PINs do not match"); return; }
    setLoading(true);
    try {
      await api.forgotPasswordConfirm(email, code, pwd);
      setStep(3);
    } catch (e) { setError(e?.message || "Invalid or expired code"); }
    finally { setLoading(false); }
  };

  const fi = { width: "100%", padding: "12px 14px", background: "#1A1A1A", border: "1.5px solid #262626", borderRadius: 10, fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 12 };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 10000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#111", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 500, maxHeight: "88vh", overflowY: "auto", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#F9E08B" }}>
            {step === 1 ? "Forgot Password" : step === 2 ? "Enter Reset Code" : "Password Reset!"}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}><X size={22} /></button>
        </div>
        {error && <div style={{ padding: "10px 14px", background: "#2D1010", border: "1px solid #EF4444", borderRadius: 8, color: "#EF4444", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
        {msg && <div style={{ padding: "10px 14px", background: "#1A2A1A", border: "1px solid #22C55E", borderRadius: 8, color: "#22C55E", fontSize: 13, marginBottom: 12 }}>{msg}</div>}

        {step === 1 && (
          <>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Enter your registered email. A 6-digit reset code will be sent.</div>
            <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} style={fi} onKeyDown={e => e.key === "Enter" && sendCode()} />
            <button onClick={sendCode} disabled={loading} style={{ width: "100%", padding: "13px", background: GOLD, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : "Send Reset Code"}
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 16 }}>Enter the code sent to <strong style={{ color: "#fff" }}>{email}</strong> and your new 6-digit PIN.</div>
            <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={fi} />
            <div style={{ position: "relative" }}>
              <input type={showPwd ? "text" : "password"} inputMode="numeric" maxLength={6} placeholder="New 6-digit PIN" value={pwd} onChange={e => setPwd(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ ...fi, paddingRight: 44 }} />
              <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            <input type="password" inputMode="numeric" maxLength={6} placeholder="Confirm new PIN" value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))} style={fi} />
            <button onClick={confirmReset} disabled={loading} style={{ width: "100%", padding: "13px", background: GOLD, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {loading ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Resetting…</> : "Reset Password"}
            </button>
            <button onClick={() => { setStep(1); setCode(""); setError(""); setMsg(""); }} style={{ background: "none", border: "none", color: "#F9E08B", fontSize: 13, cursor: "pointer", marginTop: 12, display: "flex", alignItems: "center", gap: 4 }}>
              <ChevronLeft size={14} /> Back
            </button>
          </>
        )}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#F9E08B", marginBottom: 8 }}>Password Reset!</div>
            <div style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>You can now log in with your new PIN.</div>
            <button onClick={onClose} style={{ padding: "12px 32px", background: GOLD, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Go to Login</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PhoneLoginModal({ onSuccess, onSignUp, onClose }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [focusPhone, setFocusPhone] = useState(false);
  const [focusPwd, setFocusPwd] = useState(false);

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");
    if (!phone || !password) { setError("Please fill in all fields"); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login-with-phone/', { phone, password });
      const data = res.data || res;
      api.setAuthToken(data.token);
      const userData = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email || "",
        first_name: data.user.first_name || "",
        last_name: data.user.last_name || "",
        name: data.user.first_name || data.user.username,
        profile_photo: data.user.profile_photo || null,
        bio: data.user.bio || "",
        followers_count: data.user.followers_count || 0,
        following_count: data.user.following_count || 0,
        is_staff: data.user.is_staff || false,
      };
      onSuccess(userData);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || "";
      if (msg.includes("subscription")) {
        setError("No active subscription found. Please subscribe first.");
      } else {
        setError("Invalid phone number or PIN. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showForgot && <ForgotModal onClose={() => setShowForgot(false)} />}

      <div style={{ minHeight: "100vh", background: "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Logos */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, borderRadius: 12, padding: "10px 12px", background: "linear-gradient(to right, #ffffff, #888888, #000000)" }}>
            <img src="/ethio-logo.png" alt="Ethio Telecom" style={{ width: 100, height: 50, objectFit: "contain" }} />
            <img src="/flipstar-logo.png" alt="FlipStar" style={{ width: 100, height: 50, objectFit: "contain" }} />
          </div>

          {/* Card */}
          <div style={{ background: "#1A1A1A", borderRadius: 18, padding: "28px 24px", border: "1px solid #F9E08B30" }}>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#F9E08B", marginBottom: 4 }}>Welcome Back!</div>
              <div style={{ fontSize: 13, color: "#aaa" }}>Log in to continue to FlipStar</div>
            </div>

            <form onSubmit={handleLogin}>
              {error && (
                <div style={{ padding: "10px 14px", background: "#2D1010", border: "1px solid #EF4444", borderRadius: 8, color: "#EF4444", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Phone */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9E08B", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>Phone Number</label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F9E08B", display: "flex" }}><Phone size={17} /></div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="09XXXXXXXX or +251XXXXXXXXX"
                    style={inp(focusPhone)}
                    onFocus={() => setFocusPhone(true)}
                    onBlur={() => setFocusPhone(false)}
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* PIN */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9E08B", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>6-Digit PIN</label>
                <div style={{ position: "relative" }}>
                  <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F9E08B", display: "flex" }}><Lock size={17} /></div>
                  <input
                    type={showPassword ? "text" : "password"}
                    inputMode="numeric"
                    maxLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="••••••"
                    style={{ ...inp(focusPwd), paddingRight: 46 }}
                    onFocus={() => setFocusPwd(true)}
                    onBlur={() => setFocusPwd(false)}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              {/* Forgot PIN */}
              <div style={{ textAlign: "right", marginBottom: 20 }}>
                <button type="button" onClick={() => setShowForgot(true)} style={{ background: "none", border: "none", color: "#F9E08B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  Forgot PIN?
                </button>
              </div>

              {/* Login button */}
              <button type="submit" disabled={loading} style={{ width: "100%", padding: "14px", background: loading ? "#3A3A3A" : GOLD, border: "none", borderRadius: 10, color: loading ? "#888" : "#000", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
                {loading ? <><Loader size={18} style={{ animation: "spin 1s linear infinite" }} /> Logging in…</> : "Log In"}
              </button>
            </form>

            {/* Sign up */}
            <div style={{ textAlign: "center", fontSize: 13, color: "#666" }}>
              Don't have an account?{" "}
              <button type="button" onClick={onSignUp} style={{ background: "none", border: "none", color: "#F9E08B", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                Subscribe & Register
              </button>
            </div>
          </div>

          {/* Close / Back */}
          {onClose && (
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ChevronLeft size={14} /> Back to browsing
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
