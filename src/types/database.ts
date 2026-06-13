export interface AuthSession {
    access_token: string;
    token_type: string;
    expires_in: number;
    tenant_id: string;
}

export interface Admin {
    id: string;
    name_admin: string;
    email_admin: string;
    created_at: string;
}

export interface Tenant {
    id: string;
    name: string;
    email: string;
    plan: 'free' | 'starter' | 'pro' | 'enterprise';
}
