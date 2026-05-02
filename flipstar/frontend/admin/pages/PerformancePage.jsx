import { useState, useEffect } from 'react';
import { Activity, Database, Zap, TrendingUp } from 'lucide-react';
import api from '../../api';

export function PerformancePage({ theme }) {
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformance();
    const interval = setInterval(loadPerformance, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const loadPerformance = async () => {
    try {
      const data = await api.request('/admin/performance/');
      setPerformance(data);
    } catch (error) {
      console.error('Failed to load performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: theme.sub }}>
        Loading performance data...
      </div>
    );
  }

  const current = performance?.current || {};
  const weeklyTrend = performance?.weekly_trend || [];
  const systemHealth = performance?.system_health || {};

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          margin: 0,
          fontSize: 32,
          fontWeight: 700,
          color: theme.txt,
          marginBottom: 8,
        }}>
          Platform Performance
        </h1>
        <p style={{
          margin: 0,
          fontSize: 16,
          color: theme.sub,
        }}>
          Real-time platform metrics and system health
        </p>
      </div>

      {/* Current Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 24,
        marginBottom: 32,
      }}>
        <MetricCard
          label="Total Users"
          value={current.total_users || 0}
          change={`+${current.active_today || 0} today`}
          icon={Activity}
          color={theme.blue}
          theme={theme}
        />
        <MetricCard
          label="Total Reels"
          value={current.total_reels || 0}
          change={`+${current.reels_today || 0} today`}
          icon={TrendingUp}
          color={theme.purple}
          theme={theme}
        />
        <MetricCard
          label="Total Votes"
          value={current.total_votes || 0}
          change={`+${current.votes_today || 0} today`}
          icon={Zap}
          color={theme.green}
          theme={theme}
        />
        <MetricCard
          label="DB Queries"
          value={current.db_queries || 0}
          change="Current session"
          icon={Database}
          color={theme.orange}
          theme={theme}
        />
      </div>

      {/* System Health */}
      <div style={{
        background: theme.card,
        borderRadius: 12,
        padding: 24,
        border: `1px solid ${theme.border}`,
        marginBottom: 32,
      }}>
        <h2 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: theme.txt,
          marginBottom: 20,
        }}>
          System Health
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}>
          {Object.entries(systemHealth).map(([key, status]) => (
            <div
              key={key}
              style={{
                padding: 16,
                background: theme.bg,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: theme.txt,
                textTransform: 'capitalize',
              }}>
                {key}
              </span>
              <span style={{
                padding: '4px 12px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                background: status === 'healthy' ? theme.green + '20' : theme.red + '20',
                color: status === 'healthy' ? theme.green : theme.red,
              }}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Trend */}
      {weeklyTrend.length > 0 && (
        <div style={{
          background: theme.card,
          borderRadius: 12,
          padding: 24,
          border: `1px solid ${theme.border}`,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: theme.txt,
            marginBottom: 20,
          }}>
            7-Day Trend
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: theme.bg }}>
                  <th style={headerStyle}>Date</th>
                  <th style={headerStyle}>Active Users</th>
                  <th style={headerStyle}>New Reels</th>
                  <th style={headerStyle}>New Votes</th>
                  <th style={headerStyle}>API Calls</th>
                  <th style={headerStyle}>Avg Response (ms)</th>
                </tr>
              </thead>
              <tbody>
                {weeklyTrend.map((day, index) => (
                  <tr key={day.date} style={{
                    borderTop: index > 0 ? `1px solid ${theme.border}` : 'none',
                  }}>
                    <td style={cellStyle}>{new Date(day.date).toLocaleDateString()}</td>
                    <td style={cellStyle}>{day.active_users}</td>
                    <td style={cellStyle}>{day.new_reels}</td>
                    <td style={cellStyle}>{day.new_votes}</td>
                    <td style={cellStyle}>{day.api_calls}</td>
                    <td style={cellStyle}>{day.avg_response_time_ms.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, change, icon: Icon, color, theme }) {
  return (
    <div style={{
      background: theme.card,
      borderRadius: 12,
      padding: 24,
      border: `1px solid ${theme.border}`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 16,
      }}>
        <div>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.sub,
            marginBottom: 8,
          }}>
            {label}
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: theme.txt,
          }}>
            {value.toLocaleString()}
          </div>
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: color + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Icon size={24} color={color} />
        </div>
      </div>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: color,
      }}>
        {change}
      </div>
    </div>
  );
}

const headerStyle = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 700,
  color: '#78716C',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const cellStyle = {
  padding: '12px 16px',
  fontSize: 14,
};




