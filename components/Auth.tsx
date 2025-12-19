import React, { useState, createContext, useContext, useEffect, ReactNode } from 'react';
import { login, register, logout, getCurrentUser, isLoggedIn, User } from '../services/api/auth';

// 认证上下文
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string, nickname?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 认证 Provider
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化时检查登录状态
  useEffect(() => {
    const initAuth = async () => {
      if (isLoggedIn()) {
        const result = await getCurrentUser();
        if (result.success && result.data) {
          setUser(result.data);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const result = await login({ username, password });
    if (result.success && result.data) {
      setUser(result.data.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleRegister = async (username: string, email: string, password: string, nickname?: string) => {
    const result = await register({ username, email, password, nickname });
    if (result.success && result.data) {
      setUser(result.data.user);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const refreshUser = async () => {
    if (isLoggedIn()) {
      const result = await getCurrentUser();
      if (result.success && result.data) {
        setUser(result.data);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook 使用认证
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// 登录表单组件
export const LoginForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'login') {
        result = await login(username, password);
      } else {
        result = await register(username, email, password, nickname);
      }

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || '操作失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md mx-4 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-4 text-center">
          {mode === 'login' ? '登录' : '注册'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">昵称 (可选)</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className="text-gray-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            {mode === 'login' ? '没有账号？点击注册' : '已有账号？点击登录'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 用户信息显示组件
export const UserInfo: React.FC<{ onLogout?: () => void }> = ({ onLogout }) => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    onLogout?.();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
        {user.nickname?.[0] || user.username[0]}
      </div>
      <span className="text-white text-sm">{user.nickname || user.username}</span>
      <button
        onClick={handleLogout}
        className="text-gray-400 hover:text-white text-sm"
      >
        退出
      </button>
    </div>
  );
};
