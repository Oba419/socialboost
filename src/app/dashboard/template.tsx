/** Re-mounts on each dashboard navigation: the page's top-level blocks cascade in. */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-stagger">{children}</div>;
}
