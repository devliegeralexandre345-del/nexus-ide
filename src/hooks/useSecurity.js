import { useCallback, useEffect, useRef } from 'react';

export function useSecurity(state, dispatch) {
  const lastActivityRef = useRef(Date.now());
  const lockTimerRef = useRef(null);

  // Auto-lock logic
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);

    lockTimerRef.current = setInterval(() => {
      if (state.autoLockMinutes > 0 && !state.isLocked) {
        const elapsed = (Date.now() - lastActivityRef.current) / 1000 / 60;
        if (elapsed >= state.autoLockMinutes) {
          dispatch({ type: 'SET_LOCKED', value: true });
          window.lorica.security.lockVault();
          window.lorica.security.addAuditEntry('AUTO_LOCK', `Locked after ${state.autoLockMinutes} min inactivity`);
        }
      }
    }, 30000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      clearInterval(lockTimerRef.current);
    };
  }, [state.autoLockMinutes, state.isLocked, dispatch]);

  // Check vault state on mount
  useEffect(() => {
    (async () => {
      const init = await window.lorica.security.isVaultInitialized();
      const unlocked = await window.lorica.security.isVaultUnlocked();
      dispatch({
        type: 'SET_VAULT_STATE',
        initialized: init.data,
        unlocked: unlocked.data,
      });
    })();
  }, [dispatch]);

  const unlock = useCallback(async (password) => {
    const result = await window.lorica.security.unlockVault(password);
    if (result.success) {
      dispatch({ type: 'SET_LOCKED', value: false });
      dispatch({ type: 'SET_VAULT_STATE', initialized: true, unlocked: true });
      lastActivityRef.current = Date.now();
    }
    return result;
  }, [dispatch]);

  const lock = useCallback(async () => {
    dispatch({ type: 'SET_LOCKED', value: true });
    await window.lorica.security.lockVault();
    dispatch({ type: 'SET_VAULT_STATE', initialized: true, unlocked: false });
  }, [dispatch]);

  const initVault = useCallback(async (password) => {
    const result = await window.lorica.security.initVault(password);
    if (result.success) {
      dispatch({ type: 'SET_VAULT_STATE', initialized: true, unlocked: true });
    }
    return result;
  }, [dispatch]);

  return { unlock, lock, initVault };
}

