export interface PrivacyUser {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
  factors?: { status?: string }[];
}

export interface PrivacyServices {
  getUser: (jwt: string) => Promise<PrivacyUser | null>;
  exportData: (userId: string) => Promise<unknown>;
  deletionBlockers: (userId: string) => Promise<{ admin: boolean; storage: boolean }>;
  confirmPassword: (email: string, password: string) => Promise<string | null>;
  deleteUser: (userId: string) => Promise<void>;
}

export async function handleAccountPrivacy(_request: Request, _services: PrivacyServices): Promise<Response> {
  return new Response(JSON.stringify({ ok: false, error: 'not_implemented' }), {
    status: 501, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
