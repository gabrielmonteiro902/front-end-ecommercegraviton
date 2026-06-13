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
    slug: string;
    email?: string;
    plan?: 'free' | 'starter' | 'pro' | 'enterprise';
}

export interface Repository {
    id: string;
    github_owner: string;
    github_repo: string;
    status: 'syncing' | 'active' | 'error';
    last_synced_at?: string;
}

export interface Contributor {
    id: string;
    username: string;
    avatar_url: string;
    hireable: boolean;
    location: string | null;
    company: string | null;
    linkedin_url?: string | null;
}

export interface Contribution {
    id: string;
    contributor: Contributor;
    commits_count: number;
    additions: number;
    deletions: number;
    gravity: number;
    updated_at: string;
}

export interface ContributionsResponse {
    repository: Repository;
    total_commits: number;
    contributions: Contribution[];
}
