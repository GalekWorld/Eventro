export type Role = "USER" | "LOCAL" | "RRPP" | "ADMIN";

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  displayName: string;
};
