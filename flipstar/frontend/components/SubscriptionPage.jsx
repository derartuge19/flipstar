import { useState, useEffect, useRef } from 'react';
import { Crown, Zap, Calendar, Coins, Check, X, ChevronLeft } from 'lucide-react';
import api from '../api';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

const getFallbackTiers = () => [
  {
    id: 1,
    name: 'Daily',
    duration_type: 'daily',
    price_etb: 3,
    price_coins: null,
    description: 'Access for 24 hours',
    features: ['Full access for 24 hours', 'Ad-free experience', 'HD quality videos']
  },
  {
    id: 2,
    name: 'Weekly',
    duration_type: 'weekly',
    price_etb: 20,
    price_coins: null,
    description: 'Access for 7 days',
    features: ['Full access for 7 days', 'Ad-free experience', 'HD quality videos']
  },
  {
    id: 3,
    name: 'Monthly',
    duration_type: 'monthly',
    price_etb: 70,
    price_coins: null,
    description: 'Access for 30 days',
    features: ['Full access for 30 days', 'Ad-free experience', 'HD quality videos']
  },
  {
    id: 4,
    name: 'OnDemand',
    duration_type: 'ondemand',
    price_etb: 10,
    price_coins: 100,
    description: 'Pay per use with coins',
    features: ['Flexible payment', 'No recurring charges', 'Use coins as needed']
  }
];

export function SubscriptionPage({ user, onBack }) {
  const { colors: T } = useTheme();
  const { t } = useLanguage();
  
  const [tiers, setTiers] = useState(getFallbackTiers());
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [pendingTier, setPendingTier] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const pollRef = useRef(null);
  const POLL_INTERVAL = 5000;
  const MAX_POLLS = 36; // 3 minutes

  useEffect(() => {
    // Load tiers and subscription in background
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      // Fetch both in parallel but don't block UI
      const [tiersData, subscriptionData] = await Promise.all([
        api.request('/subscriptions/tiers/active/').catch(() => []),
        api.request('/subscriptions/').catch(() => null),
      ]);
      // Only update tiers if API returns valid data
      if (Array.isArray(tiersData) && tiersData.length > 0) {
        setTiers(tiersData);
      }
      setCurrentSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      // Keep using fallback tiers
    }
  };

  const startPolling = (tier) => {
    let count = 0;
    pollRef.current = setInterval(async () => {
      count++;
      setPollCount(count);
      try {
        const sub = await api.request('/subscriptions/');
        if (sub && sub.status === 'active') {
          clearInterval(pollRef.current);
          setCurrentSubscription(sub);
          setConfirmed(true);
        }
      } catch {}
      if (count >= MAX_POLLS) {
        clearInterval(pollRef.current);
      }
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setSmsSent(false);
    setPendingTier(null);
    setPollCount(0);
    setConfirmed(false);
  };

  const handleSubscribe = (tier) => {
    const tierCode = tier.duration_type === 'daily' ? 'OK1' :
                     tier.duration_type === 'weekly' ? 'OK2' :
                     tier.duration_type === 'monthly' ? 'OK3' : 'OK4';
    const shortCode = tier.short_code || '9286';
    const smsUrl = `sms:${shortCode}?body=${encodeURIComponent(tierCode)}`;
    window.location.href = smsUrl;
    // Show pending screen after a short delay (SMS app opens)
    setTimeout(() => {
      setPendingTier(tier);
      setSmsSent(true);
      setPollCount(0);
      setConfirmed(false);
      if (user) startPolling(tier);
    }, 1500);
  };

  const handlePayment = async () => {
    if (!selectedTier) return;

    setProcessing(true);
    try {
      const response = await api.request('/subscriptions/subscribe/', {
        method: 'POST',
        body: JSON.stringify({
          tier_id: selectedTier.id,
          payment_method: paymentMethod,
        }),
      });

      if (response.status === 'success' || response.status === 'pending') {
        if (response.payment_url) {
          // Redirect to payment URL for Telebirr
          window.open(response.payment_url, '_blank');
        }
        alert(response.message || 'Subscription initiated successfully');
        setShowPaymentModal(false);
        loadSubscriptionData();
      } else {
        alert(response.error || 'Failed to subscribe');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to process subscription');
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsubscribe = async () => {
    if (confirm('Are you sure you want to cancel your subscription?')) {
      try {
        await api.request('/subscriptions/unsubscribe/', {
          method: 'POST',
        });
        alert('Subscription cancelled successfully');
        loadSubscriptionData();
      } catch (error) {
        alert('Failed to cancel subscription');
      }
    }
  };

  const getTierIcon = (durationType) => {
    switch (durationType) {
      case 'daily': return Calendar;
      case 'weekly': return Zap;
      case 'monthly': return Crown;
      case 'ondemand': return Coins;
      default: return Crown;
    }
  };

  const getTierColor = (durationType) => {
    switch (durationType) {
      case 'daily': return T.blue;
      case 'weekly': return T.green;
      case 'monthly': return T.pri;
      case 'ondemand': return T.purple;
      default: return T.pri;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: T.sub }}>
        Loading subscription data...
      </div>
    );
  }

  // ── Pending / Confirmed overlay ──
  if (smsSent && pendingTier) {
    const timedOut = pollCount >= MAX_POLLS;
    return (
      <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: 400, background: '#1A1A1A', borderRadius: 20, padding: '36px 28px', border: '1px solid #F9E08B30', textAlign: 'center' }}>

          {confirmed ? (
            <>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#F9E08B', marginBottom: 8 }}>Subscription Active!</div>
              <div style={{ fontSize: 14, color: '#aaa', marginBottom: 8 }}>
                Your <strong style={{ color: '#fff' }}>{pendingTier.name}</strong> plan is now active.
              </div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 28 }}>
                {user ? 'You can now enjoy all FlipStar features.' : 'Log in with your phone number and PIN to get started.'}
              </div>
              <button
                onClick={() => { stopPolling(); onBack && onBack(); }}
                style={{ width: '100%', padding: '14px', background: 'linear-gradient(to bottom, #D4AF37, #F9E08B, #B8860B)', border: 'none', borderRadius: 10, color: '#000', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}
              >
                {user ? 'Go to FlipStar →' : 'Log In Now →'}
              </button>
            </>
          ) : timedOut ? (
            <>
              <div style={{ fontSize: 56, marginBottom: 16 }}>⏱️</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#F9E08B', marginBottom: 8 }}>Taking longer than expected</div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 24 }}>
                Check your SMS inbox for a confirmation message from Ethiotelecom. Your subscription may still be processing.
              </div>
              <button
                onClick={() => { stopPolling(); loadSubscriptionData(); }}
                style={{ width: '100%', padding: '13px', background: 'linear-gradient(to bottom, #D4AF37, #F9E08B, #B8860B)', border: 'none', borderRadius: 10, color: '#000', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 12 }}
              >
                Check Again
              </button>
              <button
                onClick={stopPolling}
                style={{ width: '100%', padding: '13px', background: 'none', border: '1px solid #333', borderRadius: 10, color: '#aaa', fontSize: 14, cursor: 'pointer' }}
              >
                Back to Plans
              </button>
            </>
          ) : (
            <>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📱</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#F9E08B', marginBottom: 8 }}>SMS Sent!</div>
              <div style={{ fontSize: 14, color: '#aaa', marginBottom: 4 }}>
                Waiting for Ethiotelecom to confirm your <strong style={{ color: '#fff' }}>{pendingTier.name}</strong> subscription…
              </div>
              {user && (
                <div style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>
                  Checking every 5 seconds ({Math.max(0, MAX_POLLS - pollCount)} checks remaining)
                </div>
              )}
              {!user && (
                <div style={{ fontSize: 13, color: '#aaa', marginBottom: 20 }}>
                  Once confirmed, you'll receive an SMS with a link to complete your registration.
                </div>
              )}
              {/* Spinner */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  border: '3px solid #262626',
                  borderTop: '3px solid #F9E08B',
                  animation: 'spin 1s linear infinite'
                }} />
              </div>
              <div style={{ padding: '12px 16px', background: '#111', borderRadius: 10, marginBottom: 20, fontSize: 13, color: '#aaa' }}>
                <div style={{ color: '#F9E08B', fontWeight: 700, marginBottom: 4 }}>Plan selected</div>
                <div>{pendingTier.name} — {pendingTier.price_etb} ETB</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>SMS sent to: {pendingTier.short_code || '9286'}</div>
              </div>
              <button
                onClick={() => handleSubscribe(pendingTier)}
                style={{ width: '100%', padding: '11px', background: 'none', border: '1px solid #F9E08B44', borderRadius: 10, color: '#F9E08B', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}
              >
                Resend SMS
              </button>
              <button
                onClick={stopPolling}
                style={{ width: '100%', padding: '11px', background: 'none', border: '1px solid #333', borderRadius: 10, color: '#666', fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.txt }}>
      {/* Header */}
      <div style={{
        background: T.card,
        padding: '20px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
            color: T.txt,
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Subscription</h1>
      </div>

      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* Current Subscription Status */}
        {currentSubscription && currentSubscription.status === 'trial' && (
          <div style={{
            background: `${T.pri}15`,
            border: `1px solid ${T.pri}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <Calendar size={24} color={T.pri} />
            <div>
              <div style={{ fontWeight: 600, color: T.pri }}>Free Trial Active</div>
              <div style={{ color: T.sub, fontSize: 14 }}>
                {currentSubscription.days_remaining || 0} days remaining
              </div>
            </div>
          </div>
        )}

        {currentSubscription && currentSubscription.status === 'active' && (
          <div style={{
            background: `${T.green}15`,
            border: `1px solid ${T.green}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <Check size={24} color={T.green} />
            <div>
              <div style={{ fontWeight: 600, color: T.green }}>
                Active: {currentSubscription.tier?.name}
              </div>
              <div style={{ color: T.sub, fontSize: 14 }}>
                Renews on {new Date(currentSubscription.next_renewal_date).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {currentSubscription && currentSubscription.status === 'no_subscription' && (
          <div style={{
            background: `${T.red}15`,
            border: `1px solid ${T.red}`,
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <X size={24} color={T.red} />
            <div>
              <div style={{ fontWeight: 600, color: T.red }}>No Active Subscription</div>
              <div style={{ color: T.sub, fontSize: 14 }}>Choose a plan to unlock premium features</div>
            </div>
          </div>
        )}

        {/* Subscription Tiers */}
        <h2 style={{ marginBottom: 24, fontSize: 20, fontWeight: 700 }}>Choose Your Plan</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 24,
          marginBottom: 32,
        }}>
          {tiers.map((tier) => {
            const Icon = getTierIcon(tier.duration_type);
            const color = getTierColor(tier.duration_type);
            const isCurrent = currentSubscription?.tier?.name === tier.name;
            
            return (
              <div
                key={tier.id}
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
                  border: `2px solid ${isCurrent ? T.green : '#FFD700'}`,
                  borderRadius: 16,
                  padding: 24,
                  position: 'relative',
                  cursor: isCurrent ? 'default' : 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 4px 20px rgba(255, 215, 0, 0.3)',
                  ...(isCurrent ? {} : {
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 30px rgba(255, 215, 0, 0.5)',
                    }
                  })
                }}
                onClick={() => !isCurrent && handleSubscribe(tier)}
              >
                {isCurrent && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: T.green,
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    Current
                  </div>
                )}
                
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'rgba(255, 255, 255, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <Icon size={24} color="#fff" />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>
                    {tier.name}
                  </div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: '#1a1a1a', marginBottom: 8 }}>
                    {tier.price_etb} ETB
                  </div>
                  {tier.price_coins && (
                    <div style={{ fontSize: 18, color: '#333', marginBottom: 8, fontWeight: 600 }}>
                      or {tier.price_coins} coins
                    </div>
                  )}
                  <div style={{ fontSize: 16, color: '#333', marginBottom: 20, fontWeight: 500 }}>
                    {tier.description}
                  </div>
                </div>

                <div style={{ 
                  fontSize: 16, 
                  color: '#333', 
                  marginBottom: 16,
                  textTransform: 'capitalize',
                  fontWeight: 600
                }}>
                  {tier.duration_type}
                </div>

                <div style={{ marginBottom: 20 }}>
                  {tier.features?.map((feature, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        marginBottom: 10,
                        fontSize: 16,
                        color: '#1a1a1a',
                        fontWeight: 500,
                      }}
                    >
                      <Check size={20} color="#1a1a1a" />
                      {feature}
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <button
                    disabled={true}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: '#1a1a1a',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 12,
                      fontSize: 18,
                      fontWeight: 800,
                      cursor: 'default',
                      opacity: 0.8,
                      boxShadow: 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    ✓ Subscribed
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubscribe(tier)}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: '#1a1a1a',
                      color: '#fff',
                      border: '2px solid #1a1a1a',
                      borderRadius: 12,
                      fontSize: 18,
                      fontWeight: 800,
                      cursor: 'pointer',
                      opacity: 1,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
                    }}
                  >
                    📱 Subscribe via SMS
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div style={{
          background: T.card,
          borderRadius: 12,
          padding: 24,
          border: `1px solid ${T.border}`,
        }}>
          <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
            Subscription Benefits
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color={T.green} />
              <span style={{ color: T.sub }}>Access all premium features</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color={T.green} />
              <span style={{ color: T.sub }}>Ad-free experience</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color={T.green} />
              <span style={{ color: T.sub }}>HD quality videos</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color={T.green} />
              <span style={{ color: T.sub }}>Priority support</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Check size={16} color={T.green} />
              <span style={{ color: T.sub }}>Exclusive content access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


