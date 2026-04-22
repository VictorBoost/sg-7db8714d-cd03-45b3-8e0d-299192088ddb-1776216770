import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export const authService = {
  // Get current user from server-side session
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user || null;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  },

  // Get current session from server-side
  async getCurrentSession() {
    try {
      const response = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.session || null;
    } catch (error) {
      console.error("Get current session error:", error);
      return null;
    }
  },

  // Sign up with email and password
  async signUp(
    email: string,
    password: string,
    metadata: {
      first_name: string;
      last_name: string;
      phone_number: string;
      city_region: string;
      is_client: boolean;
      is_provider: boolean;
    }
  ): Promise<{ user: User | null; session: Session | null; error: any }> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
          firstName: metadata.first_name,
          lastName: metadata.last_name,
          phoneNumber: metadata.phone_number,
          cityRegion: metadata.city_region,
          isClient: metadata.is_client,
          isProvider: metadata.is_provider,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, session: null, error: { message: data.error } };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (error) {
      console.error("SignUp error:", error);
      return { user: null, session: null, error: { message: "Network error" } };
    }
  },

  // Sign in with email and password
  async signInWithPassword(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, error: { message: data.error || "Login failed" } };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during sign in" } 
      };
    }
  },

  // Sign in with Google OAuth
  async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    try {
      // Redirect to server-side Google OAuth endpoint
      window.location.href = "/api/auth/google";
      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during Google sign in" } 
      };
    }
  },

  // Sign out
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        return { error: { message: "Logout failed" } };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during sign out" } 
      };
    }
  },

  // Reset password
  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const response = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || "Password reset failed" } };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during password reset" } 
      };
    }
  },

  // Refresh session
  async refreshSession(): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, error: { message: data.error || "Session refresh failed" } };
      }

      return { user: data.user, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during session refresh" } 
      };
    }
  },

  // Listen to auth state changes (polling-based since we don't have real-time client-side session)
  onAuthStateChange(callback: (event: string, session: any) => void) {
    let lastSessionState: any = null;

    const checkSession = async () => {
      const session = await this.getCurrentSession();
      const sessionChanged = JSON.stringify(session) !== JSON.stringify(lastSessionState);

      if (sessionChanged) {
        const event = session && !lastSessionState ? "SIGNED_IN" : 
                     !session && lastSessionState ? "SIGNED_OUT" : 
                     session ? "TOKEN_REFRESHED" : "INITIAL_SESSION";
        
        callback(event, session);
        lastSessionState = session;
      }
    };

    // Check immediately
    checkSession();

    // Poll every 30 seconds
    const interval = setInterval(checkSession, 30000);

    // Return cleanup function
    return {
      data: {
        subscription: {
          unsubscribe: () => clearInterval(interval),
        },
      },
    };
  }
};