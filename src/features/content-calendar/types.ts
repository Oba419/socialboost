export interface CalendarAccount {
  id: string;
  platform: string;
  username: string | null;
  display_name: string | null;
  status: string;
}

export interface SchedulablePost {
  id: string;
  title: string | null;
  body: string;
  platform: string | null;
  status: string;
}
