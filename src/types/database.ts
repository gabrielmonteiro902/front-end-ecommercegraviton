export interface AuthSession {
    // O access_token NÃO vive mais no JS — viaja em cookie HttpOnly emitido pelo backend.
    tenant_id: string;
    token_type?: string;
    expires_in?: number;
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
    github_id?: number;
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

export interface OrbitConnection {
    id: string;
    name: string | null;
    primary_repository: Repository;
    secondary_repository: Repository;
    created_at: string;
}
