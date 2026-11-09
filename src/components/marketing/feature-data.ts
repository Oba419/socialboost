import {
  BarChart3,
  CalendarDays,
  Hash,
  Lightbulb,
  MessageCircleHeart,
  MessagesSquare,
  Repeat2,
  Share2,
  Sparkles,
  Target,
  TrendingUp,
  Type,
  UserRoundSearch,
  Users,
  Video,
  BookMarked,
  type LucideIcon,
} from "lucide-react";

export interface MarketingFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const AI_FEATURES: MarketingFeature[] = [
  { icon: Sparkles, title: "AI Content Studio", description: "Generate platform-native posts from your topic, audience, tone and objective — then edit, save or schedule them." },
  { icon: Lightbulb, title: "Content Idea Generator", description: "Daily, weekly and monthly ideas with hooks, CTAs and the reasoning behind why each may resonate." },
  { icon: Type, title: "Caption Generator", description: "Short, long, storytelling or promotional captions tailored to each platform's conventions." },
  { icon: Hash, title: "Hashtag Research", description: "Relevant hashtags grouped into broad, niche, community, industry and location sets — clearly labelled as AI suggestions." },
  { icon: Video, title: "Video Script Generator", description: "Hooks, scenes, voiceover and on-screen text for TikTok, Reels, Shorts and long-form YouTube." },
  { icon: Repeat2, title: "Content Repurposing", description: "Turn one idea into a carousel, thread, script and post — each adapted to its destination." },
];

export const FEATURE_GROUPS: { id: string; title: string; description: string; items: MarketingFeature[] }[] = [
  {
    id: "create",
    title: "Create",
    description: "AI tools that turn your expertise into consistent, original content.",
    items: AI_FEATURES,
  },
  {
    id: "plan",
    title: "Plan",
    description: "Organise everything you make and publish on a schedule you can keep.",
    items: [
      { icon: CalendarDays, title: "Content Calendar", description: "Monthly, weekly and daily views with drag-and-drop rescheduling and proper timezone handling." },
      { icon: BookMarked, title: "Content Library", description: "Drafts, saved generations, ideas and media in one searchable, filterable place." },
      { icon: Target, title: "Growth Plans", description: "Personalised 7-day and 30-day plans with daily tasks, weekly reviews and measurable targets." },
    ],
  },
  {
    id: "grow",
    title: "Grow",
    description: "Guidance for genuine audience growth — no bots, no fake engagement.",
    items: [
      { icon: MessagesSquare, title: "AI Growth Coach", description: "Ask questions and get specific, prioritised advice grounded in your brand profile and data." },
      { icon: MessageCircleHeart, title: "Engagement Assistant", description: "Reply drafts, conversation starters and community ideas you review and post yourself." },
      { icon: UserRoundSearch, title: "Profile Optimizer", description: "Assess your bio's clarity, keywords and call to action, and get alternative bios." },
      { icon: TrendingUp, title: "Trend Discovery", description: "Discussion themes and content angles for your niche, labelled as ideas to validate." },
      { icon: Users, title: "Competitor Research", description: "Track competitors you add manually and analyse the public information you record." },
    ],
  },
  {
    id: "measure",
    title: "Measure",
    description: "Understand what works using data you can trust.",
    items: [
      { icon: Share2, title: "Social Accounts", description: "Connect accounts through official OAuth. We never ask for or store your passwords." },
      { icon: BarChart3, title: "Analytics", description: "Platform-specific metrics, comparisons and exports, with every number labelled by its source." },
    ],
  },
];
