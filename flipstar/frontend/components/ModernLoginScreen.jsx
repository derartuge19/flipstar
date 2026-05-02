import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, Loader, User, ChevronDown, ChevronUp, X, ChevronLeft } from "lucide-react";
import api from "../api";
import { useTheme } from "../contexts/ThemeContext";

const GOLD = "linear-gradient(to bottom, #D4AF37 0%, #F9E08B 50%, #B8860B 100%)";

const FAQ_ITEMS = [
  { q: "What is FlipStar?", a: "FlipStar is an Ethiopian social video platform where you can share short videos, join campaigns, win prizes, and earn coins." },
  { q: "How do I earn coins?", a: "You earn coins by posting videos, daily login streaks, receiving gifts from followers, and winning campaigns." },
  { q: "How do I join a campaign?", a: "Go to the Campaigns tab, browse active campaigns, and submit your video entry. Winners are chosen by votes or judges." },
  { q: "Is FlipStar free?", a: "Yes! FlipStar is completely free. Premium features like extra campaign entries are available for purchase." },
  { q: "Who can register?", a: "Anyone with an Ethiopian phone number (+251) can register. You'll verify your number with an OTP code." },
  { q: "How do I reset my password?", a: "Tap 'Forgot password?' on the login screen. A 6-digit reset code will be sent to your registered email address." },
];

const TERMS = `TERMS & CONDITIONS — FlipStar

1. ELIGIBILITY
You must have a valid Ethiopian phone number to register.

2. CONTENT
You are responsible for all content you post. No harmful, offensive or illegal content is allowed.

3. COINS & PRIZES
Coins have no cash value unless explicitly redeemable in a campaign. Prize delivery is subject to campaign rules.

4. PRIVACY
Your phone number is used only for verification. It will never be shared with third parties.

5. ACCOUNT SECURITY
Your 6-digit PIN is your responsibility. Do not share it. FlipStar staff will never ask for your PIN.

6. TERMINATION
Accounts violating these terms may be suspended or permanently banned.

7. CHANGES
FlipStar reserves the right to update these terms at any time. Continued use constitutes acceptance.

Contact: support@flipstar.app`;

function Overlay({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9999, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#111", borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 500, maxHeight: "88vh", overflowY: "auto", padding: "24px 20px 40px" }}>
        {children}
      </div>
    </div>
  );
}

function FaqModal({ onClose }) {
  const [open, setOpen] = useState(null);
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#F9E08B" }}>FAQ</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}><X size={22} /></button>
      </div>
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} style={{ borderBottom: "1px solid #262626", marginBottom: 2 }}>
          <button onClick={() => setOpen(open === i ? null : i)}
            style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#fff", textAlign: "left" }}>{item.q}</span>
            {open === i ? <ChevronUp size={16} color="#F9E08B" /> : <ChevronDown size={16} color="#F9E08B" />}
          </button>
          {open === i && <div style={{ fontSize: 13, color: "#F9E08B", paddingBottom: 14, lineHeight: 1.6 }}>{item.a}</div>}
        </div>
      ))}
    </Overlay>
  );
}

function TermsModal({ onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#F9E08B" }}>Terms & Conditions</div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}><X size={22} /></button>
      </div>
      <pre style={{ fontSize: 12, color: "#F9E08B", whiteSpace: "pre-wrap", lineHeight: 1.7, fontFamily: "inherit" }}>{TERMS}</pre>
    </Overlay>
  );
}

function ForgotModal({ onClose }) {
  const [fpStep, setFpStep] = useState(1); // 1=email, 2=code, 3=done
  const [fpEmail, setFpEmail] = useState("");
  const [fpCode, setFpCode] = useState("");
  const [fpPwd, setFpPwd] = useState("");
  const [fpConfirm, setFpConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const sendCode = async () => {
    setError(""); setMsg("");
    if (!fpEmail) { setError("Enter your email"); return; }
    setLoading(true);
    try {
      await api.forgotPasswordRequest(fpEmail);
      setMsg("Reset code sent! Check your email.");
      setFpStep(2);
    } catch (e) { setError(e?.message || "Failed to send code"); }
    finally { setLoading(false); }
  };

  const confirmReset = async () => {
    setError(""); setMsg("");
    if (fpCode.length !== 6) { setError("Enter the 6-digit code from your email"); return; }
    if (!/^\d{6}$/.test(fpPwd)) { setError("New password must be exactly 6 digits"); return; }
    if (fpPwd !== fpConfirm) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      await api.forgotPasswordConfirm(fpEmail, fpCode, fpPwd);
      setFpStep(3);
    } catch (e) { setError(e?.message || "Invalid or expired code"); }
    finally { setLoading(false); }
  };

  const inp = { width: "100%", padding: "12px 14px", background: "#1A1A1A", border: "1.5px solid #262626", borderRadius: 10, fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 12 };

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#F9E08B" }}>
          {fpStep === 1 ? "Forgot Password" : fpStep === 2 ? "Enter Reset Code" : "Password Reset!"}
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}><X size={22} /></button>
      </div>
      {error && <div style={{ padding: "10px 14px", background: "#2D1010", border: "1px solid #EF4444", borderRadius: 8, color: "#EF4444", fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>}
      {msg && <div style={{ padding: "10px 14px", background: "#1A2A1A", border: "1px solid #22C55E", borderRadius: 8, color: "#22C55E", fontSize: 13, marginBottom: 12 }}>{msg}</div>}

      {fpStep === 1 && (
        <>
          <div style={{ fontSize: 13, color: "#F9E08B", marginBottom: 16 }}>Enter the email you registered with. A 6-digit reset code will be sent to it.</div>
          <input type="email" placeholder="your@email.com" value={fpEmail} onChange={e => setFpEmail(e.target.value)} style={inp} onKeyDown={e => e.key === "Enter" && sendCode()} />
          <button onClick={sendCode} disabled={loading} style={{ width: "100%", padding: "13px", background: GOLD, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : "Send Reset Code"}
          </button>
        </>
      )}

      {fpStep === 2 && (
        <>
          <div style={{ fontSize: 13, color: "#F9E08B", marginBottom: 16 }}>Enter the 6-digit code sent to <strong style={{ color: "#fff" }}>{fpEmail}</strong> and your new 6-digit PIN.</div>
          <input type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code from email" value={fpCode} onChange={e => setFpCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={inp} />
          <div style={{ position: "relative" }}>
            <input type={showPwd ? "text" : "password"} inputMode="numeric" maxLength={6} placeholder="New 6-digit PIN" value={fpPwd} onChange={e => setFpPwd(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ ...inp, paddingRight: 44 }} />
            <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: 12, top: 12, background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}>{showPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
          <input type="password" inputMode="numeric" maxLength={6} placeholder="Confirm new PIN" value={fpConfirm} onChange={e => setFpConfirm(e.target.value.replace(/\D/g, "").slice(0, 6))} style={inp} />
          <button onClick={confirmReset} disabled={loading} style={{ width: "100%", padding: "13px", background: GOLD, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Resetting…</> : "Reset Password"}
          </button>
          <button onClick={() => { setFpStep(1); setFpCode(""); setError(""); setMsg(""); }} style={{ background: "none", border: "none", color: "#F9E08B", fontSize: 13, cursor: "pointer", marginTop: 12, display: "block", marginLeft: "auto", marginRight: "auto", display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={14} /> Back
          </button>
        </>
      )}

      {fpStep === 3 && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#F9E08B", marginBottom: 8 }}>Password Reset!</div>
          <div style={{ fontSize: 13, color: "#F9E08B", marginBottom: 24 }}>You can now log in with your new PIN.</div>
          <button onClick={onClose} style={{ padding: "12px 32px", background: GOLD, border: "none", borderRadius: 10, color: "#000", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>Go to Login</button>
        </div>
      )}
    </Overlay>
  );
}

export function ModernLoginScreen({ onSuccess, onRegister, onBack }) {
  const { colors: T } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // 'forgot' | 'faq' | 'terms'
  const [subscriptionOtpMode, setSubscriptionOtpMode] = useState(false);
  const [subPhone, setSubPhone] = useState("");
  const [subUsername, setSubUsername] = useState("");
  const [subOtp, setSubOtp] = useState("");
  const [subPassword, setSubPassword] = useState("");
  const [showSubPassword, setShowSubPassword] = useState(false);

  // Check URL params for subscription OTP mode and auto-detect login mode
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasSubscriptionParams = params.get('subscription_tp') === 'true' || params.get('subscriptiontp') === 'true';
    
    if (hasSubscriptionParams) {
      // Check if user is already logged in
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        // User already logged in, don't show subscription OTP mode
        setSubscriptionOtpMode(false);
        return;
      }
      
      // User not logged in, check if they have an account by checking phone number
      // Extract phone from URL if present
      const phoneFromUrl = params.get('phone');
      if (phoneFromUrl) {
        // Check if phone has an account
        checkPhoneHasAccount(phoneFromUrl);
      } else {
        // No phone in URL, show subscription OTP mode by default
        setSubscriptionOtpMode(true);
      }
    }
  }, []);

  const checkPhoneHasAccount = async (phone) => {
    try {
      const response = await api.post('/auth/check-phone-account/', { phone });
      if (response.data.has_account) {
        // Phone has account, show regular login
        setSubscriptionOtpMode(false);
        // Pre-fill phone number
        setEmail(phone);
      } else {
        // Phone doesn't have account, show subscription OTP mode
        setSubscriptionOtpMode(true);
        setSubPhone(phone);
      }
    } catch (e) {
      // On error, default to subscription OTP mode
      setSubscriptionOtpMode(true);
      setSubPhone(phone);
    }
  };

  const handleLogin = async (e) => {
    e?.preventDefault();
    
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const username = email.includes("@") ? email.split("@")[0] : email;
      console.log('🔐 Attempting login for username:', username);
      const res = await api.login(username, password);
      
      console.log('✅ Login successful:', {
        userId: res.user.id,
        username: res.user.username,
        token: res.token ? res.token.substring(0, 10) + '...' : 'NONE'
      });
      
      api.setAuthToken(res.token);
      console.log('🔑 Token set via api.setAuthToken');
      
      // Include ALL user data from backend response (profile_photo, bio, etc.)
      const userData = {
        id: res.user.id,
        username: res.user.username,
        email: res.user.email,
        first_name: res.user.first_name || "",
        last_name: res.user.last_name || "",
        name: res.user.first_name || res.user.username,
        profile_photo: res.user.profile_photo || null,
        bio: res.user.bio || "",
        followers_count: res.user.followers_count || 0,
        following_count: res.user.following_count || 0,
        is_staff: res.user.is_staff || false,
      };
      
      console.log('👤 Calling onSuccess with user data:', userData);
      onSuccess(userData);
    } catch (e) {
      console.error('❌ Login error:', e);
      setError("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionOtpLogin = async (e) => {
    e?.preventDefault();
    
    if (!subPhone || !subUsername || !subOtp || !subPassword) {
      setError("Please fill in all fields");
      return;
    }
    
    if (!/^\d{6}$/.test(subPassword)) {
      setError("Password must be exactly 6 digits");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const res = await api.post('/auth/login-with-subscription-otp/', {
        phone: subPhone,
        username: subUsername,
        otp: subOtp,
        password: subPassword
      });

      console.log('✅ Subscription OTP login response:', res);

      // API response is wrapped in { data } property
      const data = res.data || res;
      api.setAuthToken(data.token);

      const userData = {
        id: data.user.id,
        username: data.user.username,
        email: data.user.email,
        first_name: data.user.first_name || "",
        last_name: data.user.last_name || "",
        name: data.user.first_name || data.user.username,
        profile_photo: data.user.profile_photo || null,
        bio: data.user.bio || "",
        followers_count: data.user.followers_count || 0,
        following_count: data.user.following_count || 0,
        is_staff: data.user.is_staff || false,
      };

      console.log('✅ Calling onSuccess with userData:', userData);
      onSuccess(userData);
    } catch (e) {
      console.error('❌ Subscription OTP login error:', e);
      console.error('❌ Error response:', e?.response?.data);
      setError(e?.response?.data?.error || "Invalid OTP or subscription not found");
    } finally {
      setLoading(false);
    }
  };

  const inp = (focused) => ({
    width: "100%", padding: "13px 16px 13px 46px",
    background: T.cardBg || "#1A1A1A",
    border: `1.5px solid ${focused ? "#F9E08B" : T.border || "#262626"}`,
    borderRadius: 10, fontSize: 15, color: T.txt || "#fff", outline: "none", boxSizing: "border-box",
  });

  return (
    <div style={{ minHeight: "100vh", background: T.bg || "#0D0D0D", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 16px" }}>
      {modal === "forgot" && <ForgotModal onClose={() => setModal(null)} />}
      {modal === "faq" && <FaqModal onClose={() => setModal(null)} />}
      {modal === "terms" && <TermsModal onClose={() => setModal(null)} />}

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logos */}
        <div style={{ 
          display: "flex", justifyContent: "space-between", alignItems: "center", 
          marginBottom: 24, borderRadius: 12, padding: "10px 12px",
          background: "linear-gradient(to right, #ffffff, #888888, #000000)"
        }}>
          <img src="/ethio-logo.png" alt="Ethio Telecom" style={{ width: 100, height: 50, objectFit: "contain" }} />
          <img src="/flipstar-logo.png" alt="FlipStar" style={{ width: 100, height: 50, objectFit: "contain" }} />
        </div>

        {/* Card */}
        <div style={{ background: T.cardBg || "#1A1A1A", borderRadius: 18, padding: "28px 24px", border: "1px solid #F9E08B30" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#F9E08B", marginBottom: 4 }}>
              {subscriptionOtpMode ? "Login to Your Account" : "Welcome Back!"}
            </div>
            <div style={{ fontSize: 13, color: "#F9E08B" }}>
              {subscriptionOtpMode ? "Log in with your subscription OTP" : "Log in to continue to FLIPSTAR"}
            </div>
          </div>

        {/* Form */}
        {subscriptionOtpMode ? (
          <form onSubmit={handleSubscriptionOtpLogin}>
            {error && (
              <div style={{ padding: "10px 14px", background: "#2D1010", border: "1px solid #EF4444", borderRadius: 8, color: "#EF4444", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Phone field */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9E08B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Phone Number</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F9E08B", display: "flex" }}><User size={17} /></div>
                <input type="tel" value={subPhone} onChange={e => setSubPhone(e.target.value)}
                  placeholder="09XXXXXXXX"
                  style={inp(false)}
                  onFocus={e => e.target.style.border = "1.5px solid #F9E08B"}
                  onBlur={e => e.target.style.border = "1.5px solid #262626"}
                />
              </div>
            </div>

            {/* Username field */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9E08B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Username</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F9E08B", display: "flex" }}><User size={17} /></div>
                <input type="text" value={subUsername} onChange={e => setSubUsername(e.target.value)}
                  placeholder="Choose a username"
                  style={inp(false)}
                  onFocus={e => e.target.style.border = "1.5px solid #F9E08B"}
                  onBlur={e => e.target.style.border = "1.5px solid #262626"}
                />
              </div>
            </div>

            {/* OTP field */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9E08B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>Subscription OTP</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F9E08B", display: "flex" }}><Lock size={17} /></div>
                <input type="text" inputMode="numeric" maxLength={6} value={subOtp} onChange={e => setSubOtp(e.target.value)}
                  placeholder="Enter OTP from SMS"
                  style={inp(false)}
                  onFocus={e => e.target.style.border = "1.5px solid #F9E08B"}
                  onBlur={e => e.target.style.border = "1.5px solid #262626"}
                />
              </div>
            </div>

            {/* New Password field */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9E08B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>New Password (6 digits)</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F9E08B", display: "flex" }}><Lock size={17} /></div>
                <input
                  type={showSubPassword ? "text" : "password"}
                  inputMode="numeric" maxLength={6}
                  value={subPassword} onChange={e => setSubPassword(e.target.value)}
                  placeholder="••••••"
                  style={{ ...inp(false), paddingRight: 46 }}
                  onFocus={e => e.target.style.border = "1.5px solid #F9E08B"}
                  onBlur={e => e.target.style.border = "1.5px solid #262626"}
                />
                <button type="button" onClick={() => setShowSubPassword(!showSubPassword)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}>
                  {showSubPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "14px", background: loading ? "#3A3A3A" : GOLD, border: "none", borderRadius: 10, color: loading ? "#888" : "#000", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              {loading ? <><Loader size={18} style={{ animation: "spin 1s linear infinite" }} /> Logging In…</> : "Login to Your Account"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin}>
            {error && (
              <div style={{ padding: "10px 14px", background: "#2D1010", border: "1px solid #EF4444", borderRadius: 8, color: "#EF4444", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {error}
              </div>
            )}

            {/* Username field */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9E08B", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>Username</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F9E08B", display: "flex" }}><User size={17} /></div>
                <input type="text" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your username"
                  style={inp(false)}
                  onFocus={e => e.target.style.border = "1.5px solid #F9E08B"}
                  onBlur={e => e.target.style.border = "1.5px solid #262626"}
                />
              </div>
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F9E08B", marginBottom: 7, textTransform: "uppercase", letterSpacing: 0.5 }}>6-Digit PIN</label>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#F9E08B", display: "flex" }}><Lock size={17} /></div>
                <input
                  type={showPassword ? "text" : "password"}
                  inputMode="numeric" maxLength={6}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••"
                  style={{ ...inp(false), paddingRight: 46 }}
                  onFocus={e => e.target.style.border = "1.5px solid #F9E08B"}
                  onBlur={e => e.target.style.border = "1.5px solid #262626"}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#F9E08B" }}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <button type="button" onClick={() => setModal("forgot")}
                style={{ background: "none", border: "none", color: "#F9E08B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "14px", background: loading ? "#3A3A3A" : GOLD, border: "none", borderRadius: 10, color: loading ? "#888" : "#000", fontSize: 15, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 16 }}>
              {loading ? <><Loader size={18} style={{ animation: "spin 1s linear infinite" }} /> Logging in…</> : "Log In"}
            </button>
          </form>
        )}

          {/* Sign up */}
          <div style={{ textAlign: "center", fontSize: 13, color: "#666", marginBottom: 0 }}>
            Don't have an account?{" "}
            <button type="button" onClick={onRegister} style={{ background: "none", border: "none", color: "#F9E08B", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>Sign up free</button>
          </div>
        </div>

        {/* Footer links */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20, paddingBottom: 20 }}>
          <button onClick={() => setModal("faq")} style={{ background: "none", border: "none", color: "#F9E08B", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>FAQ</button>
          <span style={{ color: "#262626" }}>|</span>
          <button onClick={() => setModal("terms")} style={{ background: "none", border: "none", color: "#F9E08B", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Terms & Conditions</button>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}




