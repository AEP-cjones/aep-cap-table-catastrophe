export default function Header() {
  return (
    <header
      style={{
        height: '64px',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        background: 'linear-gradient(180deg,#1C1E1F 0%,#0F1011 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.14)',
        flexShrink: 0,
      }}
    >
      <img
        src="/aep-logo-white.svg"
        alt="Accelerated Equity Plans"
        style={{
          height: '40px',
          width: 'auto',
          display: 'block',
          userSelect: 'none',
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.3))',
        }}
      />
    </header>
  )
}
