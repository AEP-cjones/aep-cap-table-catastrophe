export default function Header() {
  return (
    <header
      style={{
        height: '72px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(180deg,#1C1E1F 0%,#0F1011 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.14)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          padding: '0 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <img
          src="/aep-logo-white.svg"
          alt="AEP"
          style={{
            height: '42px',
            width: 'auto',
            display: 'block',
            userSelect: 'none',
            filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))',
          }}
        />
        <div
          style={{
            width: '1px',
            height: '32px',
            background: 'rgba(255,255,255,0.18)',
            flexShrink: 0,
          }}
        />
        <div>
          <div
            style={{
              color: 'rgba(255,255,255,0.88)',
              fontFamily: "'Eurostile','Rajdhani','Roboto',sans-serif",
              fontSize: '15px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Accelerated Equity Plans
          </div>
          <div
            style={{
              color: '#AC2228',
              fontFamily: "'Eurostile','Rajdhani','Roboto',sans-serif",
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Cap Table Catastrophe
          </div>
        </div>
      </div>
    </header>
  )
}
