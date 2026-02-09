/**
 * Auth Service - Client
 * Handles authentication API calls and token management
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface UserProfile {
  oderId: string;
  username: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  isGuest?: boolean;
  stats?: {
    gamesPlayed: number;
    wins: number;
    winRate: number;
  };
}

interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
  isNewUser?: boolean;
}

interface GuestResponse {
  user: UserProfile;
  token: string;
}

// Token storage keys
const ACCESS_TOKEN_KEY = 'mafia_access_token';
const REFRESH_TOKEN_KEY = 'mafia_refresh_token';
const USER_KEY = 'mafia_user';

class AuthService {
  private refreshPromise: Promise<AuthTokens> | null = null;

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Get current user from storage
   */
  getCurrentUser(): UserProfile | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Store tokens and user
   */
  private storeAuth(user: UserProfile, tokens: AuthTokens): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Store guest auth
   */
  private storeGuestAuth(user: UserProfile, token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Clear stored auth
   */
  clearAuth(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return !!this.getAccessToken() && !!this.getCurrentUser();
  }

  /**
   * Check if current user is guest
   */
  isGuest(): boolean {
    const user = this.getCurrentUser();
    return user?.isGuest === true;
  }

  /**
   * Register with email/password
   */
  async register(username: string, email: string, password: string, displayName?: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, displayName })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data: AuthResponse = await response.json();
    this.storeAuth(data.user, data.tokens);
    return data;
  }

  /**
   * Login with email/password
   */
  async login(emailOrUsername: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data: AuthResponse = await response.json();
    this.storeAuth(data.user, data.tokens);
    return data;
  }

  /**
   * Login with Google
   */
  async googleLogin(idToken: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Google login failed');
    }

    const data: AuthResponse = await response.json();
    this.storeAuth(data.user, data.tokens);
    return data;
  }

  /**
   * Create guest user
   */
  async createGuest(): Promise<GuestResponse> {
    const response = await fetch(`${API_BASE}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Guest creation failed');
    }

    const data: GuestResponse = await response.json();
    this.storeGuestAuth(data.user, data.token);
    return data;
  }

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<AuthTokens> {
    // Prevent multiple simultaneous refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
          this.clearAuth();
          throw new Error('Token refresh failed');
        }

        const data = await response.json();
        localStorage.setItem(ACCESS_TOKEN_KEY, data.tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
        return data.tokens;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    const token = this.getAccessToken();
    
    if (token) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
      } catch {
        // Ignore logout errors
      }
    }

    this.clearAuth();
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<UserProfile> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Try to refresh token
        await this.refreshToken();
        return this.getProfile();
      }
      throw new Error('Failed to get profile');
    }

    const data = await response.json();
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  }

  /**
   * Update profile
   */
  async updateProfile(updates: { displayName?: string; avatar?: string }): Promise<UserProfile> {
    const token = this.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Update failed');
    }

    const data = await response.json();
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    return data.user;
  }

  /**
   * Make authenticated API request with auto-refresh
   */
  async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    let token = this.getAccessToken();
    
    const makeRequest = async (accessToken: string) => {
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${accessToken}`
        }
      });
    };

    if (!token) {
      throw new Error('Not authenticated');
    }

    let response = await makeRequest(token);

    // If unauthorized, try refreshing token
    if (response.status === 401 && this.getRefreshToken()) {
      try {
        const tokens = await this.refreshToken();
        response = await makeRequest(tokens.accessToken);
      } catch {
        this.clearAuth();
        throw new Error('Session expired');
      }
    }

    return response;
  }
}

export const authService = new AuthService();
export type { UserProfile, AuthTokens, AuthResponse, GuestResponse };
