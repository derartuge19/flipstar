import { useState, useEffect } from 'react';
import { Trophy, Coins, Users, TrendingUp, AlertTriangle, Zap, Calendar, Wallet, Award, Phone, Shield } from 'lucide-react';
import api from '../../api';

export function ContestDashboardPage({ theme }) {
  const [contestData, setContestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [flashActive, setFlashActive] = useState(false);
  const [flashMultiplier, setFlashMultiplier] = useState(1.5);

  useEffect(() => {
    loadContestData();
  }, []);

  const loadContestData = async () => {
    try {
      const response = await api.request('/admin/contest/dashboard/');
      setContestData(response);
      setFlashActive(response?.is_flash_hour || false);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load contest data:', error);
      setLoading(false);
    }
  };

  const toggleFlash = async () => {
    try {
      const response = await api.request('/admin/contest/flash-toggle/', {
        method: 'POST',
        body: JSON.stringify({
          active: !flashActive,
          multiplier: flashMultiplier,
          start_time: '18:00',
          end_time: '20:00',
        }),
      });
      setFlashActive(response.flash_active);
      loadContestData();
    } catch (error) {
      console.error('Failed to toggle flash:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, color: theme.txt }}>
        Loading contest dashboard...
      </div>
    );
  }

  const budget = contestData?.budget || {};
  const stats = contestData?.stats || {};
  const daysRemaining = contestData?.days_remaining || 0;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, color: theme.txt, marginBottom: 8 }}>
          90-Day Contest Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: theme.sub }}>
          {contestData?.contest_name || 'Contest Management'}
        </p>
      </div>

      {/* Countdown & Flash Challenge */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 24,
        marginBottom: 32,
      }}>
        {/* Days Remaining */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Calendar size={24} color={theme.pri} />
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.sub }}>Contest Timeline</span>
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, color: theme.pri }}>
            {daysRemaining}
          </div>
          <div style={{ fontSize: 14, color: theme.sub }}>Days Remaining</div>
        </div>

        {/* Flash Challenge Toggle */}
        <div style={{
          background: flashActive ? theme.orange + '15' : theme.card,
          borderRadius: 16,
          padding: 24,
          border: `2px solid ${flashActive ? theme.orange : theme.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Zap size={24} color={flashActive ? theme.orange : theme.sub} />
            <span style={{ fontSize: 14, fontWeight: 600, color: flashActive ? theme.orange : theme.sub }}>
              Flash Challenge
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: flashActive ? theme.orange : theme.txt, marginBottom: 8 }}>
            {flashActive ? 'ACTIVE' : 'Inactive'}
          </div>
          <div style={{ fontSize: 14, color: theme.sub, marginBottom: 16 }}>
            {flashActive ? `${flashMultiplier}x Multiplier` : 'Toggle for Happy Hour'}
          </div>
          <button
            onClick={toggleFlash}
            style={{
              padding: '10px 20px',
              background: flashActive ? theme.red : theme.green,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {flashActive ? 'End Flash' : 'Start Flash'}
          </button>
        </div>

        {/* Total Budget */}
        <div style={{
          background: theme.card,
          borderRadius: 16,
          padding: 24,
          border: `1px solid ${theme.border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <Wallet size={24} color={theme.green} />
            <span style={{ fontSize: 14, fontWeight: 600, color: theme.sub }}>Total Budget</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: theme.green }}>
            {budget.total?.toLocaleString()} ETB
          </div>
          <div style={{ fontSize: 14, color: theme.sub }}>
            Remaining: {budget.remaining?.toLocaleString()} ETB
          </div>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div style={{
        background: theme.card,
        borderRadius: 16,
        padding: 24,
        border: `1px solid ${theme.border}`,
        marginBottom: 32,
      }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.txt, marginBottom: 20 }}>
          Budget Allocation & Spending
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {[
            { name: 'Daily', allocated: budget.allocated?.daily, spent: budget.spent?.daily, percent: 30 },
            { name: 'Weekly', allocated: budget.allocated?.weekly, spent: budget.spent?.weekly, percent: 25 },
            { name: 'Monthly', allocated: budget.allocated?.monthly, spent: budget.spent?.monthly, percent: 25 },
            { name: 'Grand Finale', allocated: budget.allocated?.grand, spent: budget.spent?.grand, percent: 20 },
          ].map((item) => (
            <div key={item.name} style={{
              padding: 16,
              background: theme.bg,
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.sub, marginBottom: 8 }}>
                {item.name} ({item.percent}%)
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.txt, marginBottom: 4 }}>
                {item.allocated?.toLocaleString()} ETB
              </div>
              <div style={{ fontSize: 12, color: theme.sub }}>
                Spent: {item.spent?.toLocaleString()} ETB
              </div>
              {/* Progress bar */}
              <div style={{
                marginTop: 8,
                height: 6,
                background: theme.border,
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(item.spent / item.allocated * 100) || 0}%`,
                  height: '100%',
                  background: (item.spent / item.allocated) > 0.8 ? theme.red : theme.pri,
                  borderRadius: 3,
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32,
      }}>
        {[
          { icon: Users, label: 'Participants', value: stats.total_participants, color: theme.blue },
          { icon: Trophy, label: 'Total Posts', value: stats.total_posts, color: theme.pri },
          { icon: Coins, label: 'Coins Distributed', value: stats.total_coins_distributed?.toLocaleString(), color: theme.green },
          { icon: Award, label: 'Active Tiers', value: '4', color: theme.orange },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: theme.card,
            borderRadius: 12,
            padding: 20,
            border: `1px solid ${theme.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: stat.color + '15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: theme.txt }}>
                {stat.value || 0}
              </div>
              <div style={{ fontSize: 12, color: theme.sub }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <button style={{
          padding: '12px 24px',
          background: theme.pri,
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          View Judging Portal
        </button>
        <button style={{
          padding: '12px 24px',
          background: theme.card,
          border: `2px solid ${theme.border}`,
          borderRadius: 8,
          color: theme.txt,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          Anti-Cheat Review
        </button>
        <button style={{
          padding: '12px 24px',
          background: theme.card,
          border: `2px solid ${theme.border}`,
          borderRadius: 8,
          color: theme.txt,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          Leaderboard Settings
        </button>
      </div>
    </div>
  );
}




