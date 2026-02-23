export type Review = {
  id: string;
  created_at: string;
  name: string;
  role: "student" | "faculty" | null;
  rating: number;
  experience: string;
  reliability_rating: number;
  would_recommend: boolean;
  security_issues: string | null;
  bugs_glitches: string | null;
  database_issues: string | null;
  feature_requests: string | null;
  ui_ux_feedback: string | null;
  other_feedback: string | null;
};

export type ReviewInsert = {
  name: string;
  role: "student" | "faculty";
  rating: number;
  experience: string;
  reliability_rating: number;
  would_recommend: boolean;
  security_issues: string | null;
  bugs_glitches: string | null;
  database_issues: string | null;
  feature_requests: string | null;
  ui_ux_feedback: string | null;
  other_feedback: string | null;
};
