export function AlertModal({ isOpen, title, message, type = 'info', onClose, onConfirm, showCancel = true }) {
  if (!isOpen) return null;

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#3B82F6';
    }
  };

  const color = getTypeColor(type);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: color + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: 24,
        }}>
          {type === 'success' && '✓'}
          {type === 'error' && '✕'}
          {type === 'warning' && '⚠'}
          {type === 'info' && 'ℹ'}
        </div>
        
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 700,
          color: '#1C1917',
          textAlign: 'center',
          marginBottom: 8,
        }}>
          {title}
        </h3>
        
        <p style={{
          margin: 0,
          fontSize: 14,
          color: '#78716C',
          textAlign: 'center',
          marginBottom: 24,
          lineHeight: 1.5,
        }}>
          {message}
        </p>
        
        <div style={{
          display: 'flex',
          gap: 12,
        }}>
          {showCancel && (
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px 16px',
                background: '#fff',
                border: '2px solid #E7E5E4',
                borderRadius: 8,
                color: '#1C1917',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              onClose();
            }}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: color,
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {onConfirm ? 'Confirm' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}




