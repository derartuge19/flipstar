import { useState, useEffect } from 'react';
import { X, Settings, Calendar, TrendingUp, Award } from 'lucide-react';
import api from '../../api';

export function GenerationConfigModal({ campaign, onClose, onSave, theme }) {
  // Calculate smart defaults based on campaign duration
  const getSmartDefaults = () => {
    if (!campaign?.start_date || !campaign?.end_date) {
      return { daily: 0, weekly: 0, monthly: 0, grand: 1 };
    }
    
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    
    // Smart defaults based on duration
    let daily = 0, weekly = 0, monthly = 0;
    
    if (diffDays <= 7) {
      // 1 week or less: all daily
      daily = diffDays;
      weekly = 0;
      monthly = 0;
    } else if (diffDays <= 30) {
      // 1 month or less: some daily + weekly
      daily = Math.min(10, diffDays); // Max 10 daily
      weekly = Math.floor(diffDays / 7);
      monthly = 0;
    } else if (diffDays <= 90) {
      // 3 months or less: weekly + monthly
      daily = 0;
      weekly = Math.floor(diffDays / 7);
      monthly = Math.floor(diffDays / 30);
    } else {
      // More than 3 months: weekly + monthly
      daily = 0;
      weekly = Math.min(12, Math.floor(diffDays / 7)); // Max 12 weekly
      monthly = Math.floor(diffDays / 30);
    }
    
    return { daily, weekly, monthly, grand: 1 };
  };
  
  const smartDefaults = getSmartDefaults();
  
  const [config, setConfig] = useState({
    auto_generate_daily: campaign?.auto_generate_daily ?? (smartDefaults.daily > 0),
    auto_generate_weekly: campaign?.auto_generate_weekly ?? (smartDefaults.weekly > 0),
    auto_generate_monthly: campaign?.auto_generate_monthly ?? (smartDefaults.monthly > 0),
    auto_generate_grand: campaign?.auto_generate_grand ?? true,
    daily_campaign_count: campaign?.daily_campaign_count ?? smartDefaults.daily,
    weekly_campaign_count: campaign?.weekly_campaign_count ?? smartDefaults.weekly,
    monthly_campaign_count: campaign?.monthly_campaign_count ?? smartDefaults.monthly,
    grand_campaign_count: campaign?.grand_campaign_count ?? smartDefaults.grand,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate max possible campaigns based on date range
  const getMaxCampaigns = (type) => {
    if (!campaign?.start_date || !campaign?.end_date) return 0;
    
    const start = new Date(campaign.start_date);
    const end = new Date(campaign.end_date);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    switch(type) {
      case 'daily':
        return diffDays + 1;
      case 'weekly':
        return Math.ceil(diffDays / 7);
      case 'monthly':
        return Math.ceil(diffDays / 30);
      case 'grand':
        return 1;
      default:
        return 0;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.request(`/admin/master-campaigns/${campaign.id}/config/`, {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      
      onSave(response);
      onClose();
    } catch (err) {
      console.error('Failed to update configuration:', err);
      setError('Failed to update configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First save the configuration
      await api.request(`/admin/master-campaigns/${campaign.id}/config/`, {
        method: 'PUT',
        body: JSON.stringify(config)
      });
      
      // Then trigger generation with cleanup flag
      const response = await api.request(`/admin/master-campaigns/${campaign.id}/generate/`, {
        method: 'POST',
        body: JSON.stringify({
          generate_daily: config.auto_generate_daily,
          generate_weekly: config.auto_generate_weekly,
          generate_monthly: config.auto_generate_monthly,
          generate_grand: config.auto_generate_grand,
          cleanup_excess: true  // New flag to remove excess campaigns
        })
      });
      
      const message = response.message || `Generated ${response.campaigns?.length || 0} sub-campaigns`;
      alert(message);
      onSave(response);
      onClose();
    } catch (err) {
      console.error('Failed to generate campaigns:', err);
      setError(err.message || 'Failed to generate campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const campaignTypes = [
    {
      key: 'daily',
      label: 'Daily Campaigns',
      icon: Calendar,
      color: theme.blue,
      description: 'One campaign per day',
      max: getMaxCampaigns('daily'),
      current: campaign?.total_daily_campaigns || 0
    },
    {
      key: 'weekly',
      label: 'Weekly Campaigns',
      icon: TrendingUp,
      color: theme.green,
      description: 'One campaign per week',
      max: getMaxCampaigns('weekly'),
      current: campaign?.total_weekly_campaigns || 0
    },
    {
      key: 'monthly',
      label: 'Monthly Campaigns',
      icon: Calendar,
      color: theme.orange,
      description: 'One campaign per month',
      max: getMaxCampaigns('monthly'),
      current: campaign?.total_monthly_campaigns || 0
    },
    {
      key: 'grand',
      label: 'Grand Campaign',
      icon: Award,
      color: theme.pri,
      description: 'Final championship',
      max: 1,
      current: campaign?.total_grand_campaigns || 0
    }
  ];

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: 20
    }} onClick={onClose}>
      <div style={{
        background: theme.card,
        borderRadius: 12,
        width: '100%',
        maxWidth: 600,
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 20,
          borderBottom: `1px solid ${theme.border}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: `${theme.pri}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Settings size={20} color={theme.pri} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.txt }}>
                Generation Configuration
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: theme.sub }}>
                Configure sub-campaign generation
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: theme.bg,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <X size={16} color={theme.sub} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            margin: 20,
            padding: 12,
            background: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
            color: '#DC2626',
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        {/* Summary */}
        <div style={{
          margin: '20px 20px 0',
          padding: 16,
          background: theme.pri + '10',
          border: `1px solid ${theme.pri}30`,
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: theme.txt, marginBottom: 8 }}>
            📊 Generation Summary
          </div>
          <div style={{ fontSize: 12, color: theme.sub, lineHeight: 1.6 }}>
            Campaign Duration: <strong>{campaign?.duration_days || 0} days</strong><br/>
            Total to Generate: <strong>
              {(config.auto_generate_daily ? (config.daily_campaign_count || getMaxCampaigns('daily')) : 0) +
               (config.auto_generate_weekly ? (config.weekly_campaign_count || getMaxCampaigns('weekly')) : 0) +
               (config.auto_generate_monthly ? (config.monthly_campaign_count || getMaxCampaigns('monthly')) : 0) +
               (config.auto_generate_grand ? config.grand_campaign_count : 0)} campaigns
            </strong>
            {' '}(
              {config.auto_generate_daily && `${config.daily_campaign_count || getMaxCampaigns('daily')} daily`}
              {config.auto_generate_daily && (config.auto_generate_weekly || config.auto_generate_monthly || config.auto_generate_grand) && ', '}
              {config.auto_generate_weekly && `${config.weekly_campaign_count || getMaxCampaigns('weekly')} weekly`}
              {config.auto_generate_weekly && (config.auto_generate_monthly || config.auto_generate_grand) && ', '}
              {config.auto_generate_monthly && `${config.monthly_campaign_count || getMaxCampaigns('monthly')} monthly`}
              {config.auto_generate_monthly && config.auto_generate_grand && ', '}
              {config.auto_generate_grand && `${config.grand_campaign_count} grand`}
            )
          </div>
        </div>

        {/* Campaign Types */}
        <div style={{ padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {campaignTypes.map(type => {
              const IconComponent = type.icon;
              return (
              <div key={type.key} style={{
                background: theme.bg,
                borderRadius: 8,
                padding: 16,
                border: `1px solid ${theme.border}`
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: `${type.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconComponent size={18} color={type.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: theme.txt }}>
                        {type.label}
                      </h3>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          checked={config[`auto_generate_${type.key}`]}
                          onChange={(e) => setConfig({
                            ...config,
                            [`auto_generate_${type.key}`]: e.target.checked
                          })}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13, color: theme.sub }}>Enable</span>
                      </label>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: theme.sub }}>
                      {type.description}
                    </p>
                  </div>
                </div>

                {config[`auto_generate_${type.key}`] && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 500,
                      color: theme.txt,
                      marginBottom: 6
                    }}>
                      Number of {type.label} (0 = all possible)
                    </label>
                    <div style={{ marginBottom: 8, fontSize: 12, color: theme.sub }}>
                      Current: <strong>{type.current}</strong> {type.label.toLowerCase()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input
                        type="number"
                        min="0"
                        max={type.max}
                        value={config[`${type.key}_campaign_count`]}
                        onChange={(e) => setConfig({
                          ...config,
                          [`${type.key}_campaign_count`]: parseInt(e.target.value) || 0
                        })}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: `1px solid ${theme.border}`,
                          background: theme.card,
                          color: theme.txt,
                          fontSize: 14
                        }}
                        placeholder={`Suggested: ${smartDefaults[type.key]}`}
                      />
                      <span style={{ fontSize: 13, color: theme.sub }}>
                        Max: {type.max}
                      </span>
                    </div>
                    {(() => {
                      const targetCount = config[`${type.key}_campaign_count`] || type.max;
                      const diff = targetCount - type.current;
                      if (diff > 0) {
                        return (
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: theme.green }}>
                            ➕ Will add {diff} {type.label.toLowerCase()}
                          </p>
                        );
                      } else if (diff < 0) {
                        return (
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: theme.red }}>
                            ➖ Will remove {Math.abs(diff)} {type.label.toLowerCase()} (farthest dates first)
                          </p>
                        );
                      } else {
                        return (
                          <p style={{ margin: '6px 0 0', fontSize: 12, color: theme.sub }}>
                            ✓ No change needed
                          </p>
                        );
                      }
                    })()}
                    {config[`${type.key}_campaign_count`] === 0 && (
                      <p style={{ margin: '6px 0 0', fontSize: 12, color: type.color }}>
                        Will generate all {type.max} {type.label.toLowerCase()}
                      </p>
                    )}
                    {smartDefaults[type.key] > 0 && config[`${type.key}_campaign_count`] !== smartDefaults[type.key] && (
                      <p style={{ margin: '6px 0 0', fontSize: 11, color: theme.sub }}>
                        💡 Suggested: {smartDefaults[type.key]} based on campaign duration
                      </p>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          gap: 12,
          padding: 20,
          borderTop: `1px solid ${theme.border}`
        }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            background: theme.bg,
            color: theme.txt,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading} style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: theme.blue,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}>
            {loading ? 'Saving...' : 'Save Config'}
          </button>
          <button onClick={handleGenerate} disabled={loading} style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: theme.pri,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1
          }}>
            {loading ? 'Generating...' : 'Save & Generate'}
          </button>
        </div>
      </div>
    </div>
  );
}




