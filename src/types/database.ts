export interface Database {
    public: {
      Tables: {
        admins: {
          Row: { 
            id: string
            name_admin: string
            email_admin: string
            password_admin: string
            created_at: string
          }
          Insert: { /* ... */ }
          Update: { /* ... */ }
        }
      }
    }
  }