export default function SignalCable({ from, to }: { from: string; to: string }) {
  return (
    <div className="patch-cable">
      <svg
        className="signal-cable horizontal-cable"
        viewBox="0 0 64 112"
        role="img"
        aria-label={`Cable from ${from} to ${to}`}
      >
        <path className="cable-sheath" d="M0 72 C18 72 12 100 32 100 S46 72 64 72" />
        <path className="cable-wire" d="M0 72 C18 72 12 100 32 100 S46 72 64 72" />
        <path className="cable-flow" d="M0 72 C18 72 12 100 32 100 S46 72 64 72" />
        <path className="cable-plugs" d="M0 72 H8 M56 72 H64" />
      </svg>
      <svg
        className="signal-cable vertical-cable"
        viewBox="0 0 112 64"
        role="img"
        aria-label={`Cable from ${from} to ${to}`}
      >
        <path className="cable-sheath" d="M56 0 C56 18 84 12 84 32 S56 46 56 64" />
        <path className="cable-wire" d="M56 0 C56 18 84 12 84 32 S56 46 56 64" />
        <path className="cable-flow" d="M56 0 C56 18 84 12 84 32 S56 46 56 64" />
        <path className="cable-plugs" d="M56 0 V8 M56 56 V64" />
      </svg>
    </div>
  );
}
