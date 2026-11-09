import {
  BarChart3,
  Bell,
  BookMarked,
  CalendarDays,
  CreditCard,
  Hash,
  Lightbulb,
  LayoutDashboard,
  MessageCircleHeart,
  MessagesSquare,
  Repeat2,
  Settings,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Type,
  UserRoundSearch,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "./plans";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Entitlement needed; shows a lock badge when missing. */
  feature?: FeatureKey;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const DASHBOARD_NAV: NavGroup[] = [
  { label: "", items: [{ title: "Overview", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Create",
    items: [
      { title: "AI Studio", href: "/dashboard/studio", icon: Sparkles, feature: "content_studio" },
      { title: "Content Ideas", href: "/dashboard/ideas", icon: Lightbulb, feature: "content_ideas" },
      { title: "Caption Generator", href: "/dashboard/captions", icon: Type, feature: "caption_generator" },
      { title: "Hashtag Research", href: "/dashboard/hashtags", icon: Hash, feature: "hashtag_research" },
      { title: "Video Scripts", href: "/dashboard/video-scripts", icon: Video, feature: "video_scripts" },
      { title: "Repurposing", href: "/dashboard/repurpose", icon: Repeat2, feature: "content_repurposing" },
    ],
  },
  {
    label: "Plan",
    items: [
      { title: "Content Calendar", href: "/dashboard/calendar", icon: CalendarDays, feature: "content_calendar" },
      { title: "Content Library", href: "/dashboard/library", icon: BookMarked },
      { title: "Growth Plans", href: "/dashboard/growth-plans", icon: Target, feature: "growth_plan_7d" },
    ],
  },
  {
    label: "Grow",
    items: [
      { title: "AI Growth Coach", href: "/dashboard/coach", icon: MessagesSquare, feature: "growth_coach" },
      { title: "Engagement Assistant", href: "/dashboard/engagement", icon: MessageCircleHeart, feature: "engagement_assistant" },
      { title: "Profile Optimizer", href: "/dashboard/profile-optimizer", icon: UserRoundSearch, feature: "profile_optimizer" },
      { title: "Trend Discovery", href: "/dashboard/trends", icon: TrendingUp, feature: "trend_discovery" },
      { title: "Competitor Research", href: "/dashboard/competitors", icon: Users, feature: "competitor_research" },
    ],
  },
  {
    label: "Measure",
    items: [
      { title: "Social Accounts", href: "/dashboard/accounts", icon: Share2 },
      { title: "Analytics", href: "/dashboard/analytics", icon: BarChart3, feature: "analytics" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Notifications", href: "/dashboard/notifications", icon: Bell },
      { title: "Subscription & Billing", href: "/dashboard/billing", icon: CreditCard },
      { title: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export const MARKETING_NAV = [
  { title: "Features", href: "/features" },
  { title: "Pricing", href: "/pricing" },
  { title: "About", href: "/about" },
  { title: "Contact", href: "/contact" },
];
