import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './store';
import { toast } from '@/components/ui/Toast';

const IDLE_MS = 2 * 60 * 1000; // 2 minutes
const ACTIVITY_EVENTS = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'wheel',
] as const;

/**
 * Trash the in-memory session after 2 minutes without user activity. Mounted
 * once at the top of the authenticated shell. The session has no persistence,
 * so logging out is effectively a hard reset — the user is sent back to /login.
 */
export function useIdleTimeout(): void {
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const navigate = useNavigate();
  const timer = useRef<number | null>(null);
  const armed = useRef<boolean>(false);

  useEffect(() => {
    if (!session) {
      // Disarm if signed out — nothing to time.
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      armed.current = false;
      return;
    }

    armed.current = true;

    const expire = async () => {
      if (!armed.current) return;
      armed.current = false;
      await signOut();
      toast.warn('Signed out after 2 minutes of inactivity.');
      navigate('/login', { replace: true });
    };

    const reset = () => {
      if (!armed.current) return;
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(expire, IDLE_MS);
    };

    // Throttle event firing: re-arm at most once per second.
    let lastReset = 0;
    const throttledReset = () => {
      const now = Date.now();
      if (now - lastReset < 1000) return;
      lastReset = now;
      reset();
    };

    const onVisibility = () => {
      // Tab becoming visible counts as activity; backgrounding does not extend.
      if (document.visibilityState === 'visible') reset();
    };

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, throttledReset, { passive: true }),
    );
    document.addEventListener('visibilitychange', onVisibility);

    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, throttledReset));
      document.removeEventListener('visibilitychange', onVisibility);
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      armed.current = false;
    };
  }, [session, signOut, navigate]);
}
