export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: Record<string, never>
    // Define your tables here
    // Example:
    // users: {
    //   Row: {
    //     id: string
    //     email: string
    //     created_at: string
    //   }
    //   Insert: {
    //     id?: string
    //     email: string
    //     created_at?: string
    //   }
    //   Update: {
    //     id?: string
    //     email?: string
    //     created_at?: string
    //   }
    // }
    Views: Record<string, never>
    // Define your views here
    Functions: Record<string, never>
    // Define your functions here
    Enums: Record<string, never>
    // Define your enums here
  }
}
