import type { UserType } from "@/types/database";

export const USER_TYPES: { value: UserType; label: string; description: string }[] = [
  { value: "creator", label: "Creator", description: "I make content around my interests or expertise." },
  { value: "influencer", label: "Influencer", description: "I partner with brands and grow a personal audience." },
  { value: "business", label: "Business", description: "I market a company, shop or service." },
  { value: "entrepreneur", label: "Entrepreneur", description: "I'm building a personal brand alongside my venture." },
  { value: "agency", label: "Agency", description: "I manage social media for multiple clients." },
  { value: "social_media_manager", label: "Social media manager", description: "I run social channels for an organisation." },
];

export const NICHE_SUGGESTIONS = [
  "Fashion & style",
  "Beauty & skincare",
  "Fitness & wellness",
  "Food & cooking",
  "Tech & gadgets",
  "Personal finance",
  "Business & entrepreneurship",
  "Education & coaching",
  "Travel",
  "Music & entertainment",
  "Real estate",
  "Parenting & family",
  "Gaming",
  "Faith & inspiration",
  "Art & design",
  "Health care",
];

export const GOALS = [
  "Increase followers",
  "Increase engagement",
  "Build brand awareness",
  "Generate leads",
  "Increase sales",
  "Build a community",
  "Grow website traffic",
  "Become a thought leader",
];

export const POSTING_FREQUENCIES = [
  "1–2 posts per week",
  "3–4 posts per week",
  "Daily",
  "Multiple times per day",
];

export const CONTENT_FORMATS = ["Short videos", "Long videos", "Photos", "Carousels", "Text posts", "Stories", "Live streams", "Podcasts / audio"];

export const ONBOARDING_STEPS = [
  { title: "About you", description: "Tell us a little about yourself." },
  { title: "Who you are", description: "This shapes the tone of our recommendations." },
  { title: "Your niche", description: "What do you create content about?" },
  { title: "Platforms", description: "Which platforms do you want to grow?" },
  { title: "Goals", description: "What does success look like for you?" },
  { title: "Where you are now", description: "Your starting point and capacity." },
  { title: "Your plan", description: "Your personalised growth assessment." },
] as const;

export const TOTAL_STEPS = ONBOARDING_STEPS.length;
