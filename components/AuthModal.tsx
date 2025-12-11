import React, { useState } from 'react';
import { login, register, User } from '../services/api/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const result = await login({ username, password });
        if (result.success && result.data) {
          onLoginSuccess(result.data.user);
          onClose();
          resetForm();
        } else {
          setError(result.error || '登录失败');
        }
      } else {
        const result = await register({ username, email, password, nickname });
        if (result.success && result.data) {
          onLoginSuccess(result.data.user);
          onClose();
          resetForm();
        } else {
          setError(result.error || '注册失败');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setUsername('');
    setEmail('');
    setPassword('');
    setNickname('');
    setError(null);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* 弹窗内容 */}
      <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* 头部 */}
        <div className="p-6 border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
          <h2 className="text-xl font-bold text-white">
            🐧 {mode === 'login' ? '登录 Pebbling UI' : '加入 Pebbling UI'}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {mode === 'login' ? '欢迎回来，继续你的创作之旅' : '注册账号，开启AI创作之旅'}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 错误提示 */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="输入用户名"
              required
              disabled={loading}
            />
          </div>

          {/* 邮箱 (仅注册) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="输入邮箱地址"
                required
                disabled={loading}
              />
            </div>
          )}

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="输入密码"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {/* 昵称 (仅注册) */}
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">昵称 (可选)</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="输入昵称"
                disabled={loading}
              />
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                处理中...
              </span>
            ) : (
              mode === 'login' ? '登录' : '注册'
            )}
          </button>

          {/* 切换模式 */}
          <div className="text-center text-sm text-gray-500">
            {mode === 'login' ? '还没有账号？' : '已有账号？'}
            <button
              type="button"
              onClick={switchMode}
              className="ml-1 text-indigo-400 hover:text-indigo-300 transition-colors"
              disabled={loading}
            >
              {mode === 'login' ? '立即注册' : '立即登录'}
            </button>
          </div>
        </form>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
