-- Default plan catalogue. Mirrors src/config/plans.ts (a unit test checks they
-- stay in sync). Admins can change prices/limits later from the admin panel.
-- Amounts in kobo.

insert into public.subscription_plans
  (id, name, description, price_monthly, price_annual, currency, price_is_starting_from, highlighted, features, limits, marketing_bullets, sort_order)
values
  ('free', 'Free', 'Try the essentials and plan your first posts.', 0, 0, 'NGN', false, false,
   array['content_ideas','caption_generator','hashtag_research'],
   '{"aiCreditsPerPeriod":30,"savedItems":50,"socialAccounts":2,"scheduledPostsPerMonth":0,"workspaces":1,"teamMembers":1,"mediaStorageMb":100}',
   array['30 AI credits / month','Content ideas, captions & hashtags','Up to 50 saved items','Basic dashboard'], 0),

  ('starter', 'Starter', 'For creators building a consistent posting habit.', 500000, 5000000, 'NGN', false, false,
   array['content_ideas','caption_generator','hashtag_research','video_scripts','content_studio','content_calendar','growth_plan_7d','engagement_assistant'],
   '{"aiCreditsPerPeriod":200,"savedItems":500,"socialAccounts":5,"scheduledPostsPerMonth":60,"workspaces":1,"teamMembers":1,"mediaStorageMb":1000}',
   array['200 AI credits / month','Content calendar & scheduling','Video scripts & AI Studio','7-day growth plans'], 1),

  ('creator_pro', 'Creator Pro', 'Advanced AI and analytics for serious creators.', 1200000, 12000000, 'NGN', false, true,
   array['content_ideas','caption_generator','hashtag_research','video_scripts','content_studio','content_calendar','growth_plan_7d','engagement_assistant','content_repurposing','growth_plan_30d','growth_coach','profile_optimizer','trend_discovery','competitor_research','analytics'],
   '{"aiCreditsPerPeriod":1000,"savedItems":null,"socialAccounts":10,"scheduledPostsPerMonth":300,"workspaces":1,"teamMembers":1,"mediaStorageMb":5000}',
   array['1,000 AI credits / month','Content repurposing','30-day growth plans & AI coach','Analytics, trends & competitor research'], 2),

  ('business', 'Business', 'Multi-brand management with your team.', 2500000, 25000000, 'NGN', false, false,
   array['content_ideas','caption_generator','hashtag_research','video_scripts','content_studio','content_calendar','growth_plan_7d','engagement_assistant','content_repurposing','growth_plan_30d','growth_coach','profile_optimizer','trend_discovery','competitor_research','analytics','advanced_reporting','report_export','multi_brand','team_members'],
   '{"aiCreditsPerPeriod":3000,"savedItems":null,"socialAccounts":25,"scheduledPostsPerMonth":null,"workspaces":3,"teamMembers":5,"mediaStorageMb":20000}',
   array['3,000 AI credits / month','Up to 3 brands','5 team members','Advanced reporting & exports'], 3),

  ('agency', 'Agency', 'Client workspaces, team management and reporting.', 5000000, 50000000, 'NGN', true, false,
   array['content_ideas','caption_generator','hashtag_research','video_scripts','content_studio','content_calendar','growth_plan_7d','engagement_assistant','content_repurposing','growth_plan_30d','growth_coach','profile_optimizer','trend_discovery','competitor_research','analytics','advanced_reporting','report_export','multi_brand','team_members','client_workspaces'],
   '{"aiCreditsPerPeriod":10000,"savedItems":null,"socialAccounts":100,"scheduledPostsPerMonth":null,"workspaces":25,"teamMembers":20,"mediaStorageMb":100000}',
   array['10,000 AI credits / month','Up to 25 client workspaces','20 team members','Client reporting'], 4)
on conflict (id) do nothing;
