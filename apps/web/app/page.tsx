export default function Home() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 48, fontWeight: 700, margin: 0 }}>MyBudget</h1>
      <p style={{ color: '#A0A0C8', fontSize: 18, marginTop: 12 }}>
        Privacy-first envelope budgeting with subscription tracking
      </p>
      <p style={{ color: '#6B6B8A', fontSize: 14, marginTop: 24 }}>
        Web app coming soon. Mobile app in development.
      </p>
    </main>
  );
}
