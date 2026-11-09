/** Re-mounts on every navigation, giving each marketing page a smooth enter. */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
