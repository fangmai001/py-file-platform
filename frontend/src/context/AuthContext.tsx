import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentUser, login as apiLogin } from "../api/auth";
import { clearToken, getToken, setToken, setUnauthorizedHandler } from "../api/client";
import type { UserItem } from "../api/types";

interface AuthContextValue {
  user: UserItem | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: UserItem) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // token 過期後，原本只有「重新整理」才會被這個開機檢查抓到。執行期間過期的話，畫面會停在
  // 「看似已登入、但每個操作都失敗」的狀態，而 localStorage 裡那個失效的值一直留著。
  // 這裡把 client.ts 收到 401 的時機接起來，讓它等同於一次登出——App.tsx 的兩個守衛看到
  // user 變成 null 就會自動導向登入頁。
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearToken();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (!getToken()) {
      setIsLoading(false);
      return;
    }
    fetchCurrentUser()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  async function login(username: string, password: string) {
    const { access_token } = await apiLogin(username, password);
    setToken(access_token);
    const me = await fetchCurrentUser();
    setUser(me);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
