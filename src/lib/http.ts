export type ActionState = {
  code?: string;
  error?: string;
  success?: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};
