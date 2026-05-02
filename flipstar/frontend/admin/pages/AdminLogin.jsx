import { useState } from 'react';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export function AdminLogin({ onLogin, theme }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await onLogin(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${theme.dark} 0%, ${theme.pri} 100%)`,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        padding: 40,
        background: theme.card,
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{
          textAlign: 'center',
          marginBottom: 32,
        }}>
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto 16px',
            borderRadius: '50%',
            background: theme.pri,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
          }}>
            ⚡
          </div>
          <h1 style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 700,
            color: theme.txt,
            marginBottom: 8,
          }}>
            Admin Panel
          </h1>
          <p style={{
            margin: 0,
            fontSize: 14,
            color: theme.sub,
          }}>
            Sign in to access the dashboard
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: `${theme.red}15`,
            border: `1px solid ${theme.red}`,
            borderRadius: 8,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: theme.red,
            fontSize: 14,
          }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: theme.txt,
              marginBottom: 8,
            }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={20} style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.sub,
              }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@flipstar.com"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = theme.pri}
                onBlur={(e) => e.target.style.borderColor = theme.border}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              color: theme.txt,
              marginBottom: 8,
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                color: theme.sub,
              }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 48px',
                  border: `1px solid ${theme.border}`,
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = theme.pri}
                onBlur={(e) => e.target.style.borderColor = theme.border}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: theme.pri,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 24,
          paddingTop: 24,
          borderTop: `1px solid ${theme.border}`,
          background: '#fff',
          textAlign: 'center',
        }}>
          <p style={{
            margin: 0,
            fontSize: 12,
            color: theme.sub,
            fontWeight: 500,
          }}>
            🔒 Secure admin access only
          </p>
        </div>
      </div>
    </div>
  );
}




