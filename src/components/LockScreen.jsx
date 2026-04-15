import React, { useState, useRef, useEffect } from 'react';
import { Lock, Unlock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LockScreen({ onUnlock, onInit, vaultInitialized }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isInit, setIsInit] = useState(!vaultInitialized);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isInit) {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      const result = await onInit(password);
      if (!result.success) {
        setError(result.error || 'Failed to initialize vault');
      }
    } else {
      const result = await onUnlock(password);
      if (!result.success) {
        setError('Invalid password');
        setPassword('');
      }
    }
  };

  return (
    <div className="lock-backdrop fixed inset-0 z-50 flex items-center justify-center">
      <div className="w-[380px] bg-lorica-panel border border-lorica-border rounded-2xl shadow-2xl p-8 animate-fadeIn">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lorica-accent/10 border border-lorica-accent/20 mb-4">
            <Lock size={28} className="text-lorica-accent" />
          </div>
          <h1 className="text-xl font-bold text-lorica-text">Lorica</h1>
          <p className="text-xs text-lorica-textDim mt-1">
            {isInit ? 'Create a master password to secure your vault' : 'Enter your master password to unlock'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Password */}
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Master Password"
              className="w-full bg-lorica-bg border border-lorica-border rounded-lg px-4 py-2.5 text-sm text-lorica-text outline-none focus:border-lorica-accent transition-colors pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-lorica-textDim hover:text-lorica-text"
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {/* Confirm password (init only) */}
          {isInit && (
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
              className="w-full bg-lorica-bg border border-lorica-border rounded-lg px-4 py-2.5 text-sm text-lorica-text outline-none focus:border-lorica-accent transition-colors"
            />
          )}

          {/* Error */}
          {error && (
            <div className="text-xs text-lorica-danger bg-lorica-danger/10 border border-lorica-danger/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-lorica-accent text-lorica-bg font-semibold py-2.5 rounded-lg hover:bg-lorica-accent/90 transition-colors text-sm"
          >
            {isInit ? <ShieldCheck size={16} /> : <Unlock size={16} />}
            {isInit ? 'Create Vault & Enter' : 'Unlock'}
          </button>
        </form>

        {/* Toggle init/unlock */}
        {vaultInitialized && isInit && (
          <button
            onClick={() => setIsInit(false)}
            className="w-full text-center text-xs text-lorica-textDim hover:text-lorica-accent mt-4 transition-colors"
          >
            Already have a vault? Sign in
          </button>
        )}
        {!vaultInitialized && !isInit && (
          <button
            onClick={() => setIsInit(true)}
            className="w-full text-center text-xs text-lorica-textDim hover:text-lorica-accent mt-4 transition-colors"
          >
            Create a new vault
          </button>
        )}
      </div>
    </div>
  );
}

