import { useEffect, useRef, useCallback } from 'react';

// Default timeout is 25 minutes in milliseconds
const DEFAULT_TIMEOUT = 25 * 60 * 1000;

export const useInactivityTimeout = (
    onTimeout: () => void,
    isAuthenticated: boolean,
    timeoutMs: number = DEFAULT_TIMEOUT,
    onWarning?: () => void,
    warningMs?: number
) => {
    const lastActivityRef = useRef<number>(Date.now());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const hasWarnedRef = useRef<boolean>(false);

    // Update the last activity timestamp
    const updateLastActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
        hasWarnedRef.current = false; // Reset warning flag on activity
    }, []);

    useEffect(() => {
        // Only set up listeners and interval if we are authenticated
        if (!isAuthenticated) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial setup
        updateLastActivity();

        // Handle tab visibility changes
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // El usuario ya no está interactuando con el proyecto
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // We use an interval to periodically check if the user has been inactive.
        intervalRef.current = setInterval(() => {
            const currentTime = Date.now();
            const elapsed = currentTime - lastActivityRef.current;

            // Check for timeout
            if (elapsed >= timeoutMs) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                onTimeout();
                return;
            }

            // Check for warning
            if (onWarning && warningMs && elapsed >= warningMs && !hasWarnedRef.current) {
                hasWarnedRef.current = true;
                onWarning();
            }
        }, 10000); // Check every 10 seconds

        // Events that denote user activity
        const events = ['mousedown', 'keydown', 'scroll', 'click', 'api-request'];

        // Throttle the event listeners locally so we don't query Date.now() a million times on mouse move
        let throttleTimeout: NodeJS.Timeout | null = null;
        const handleActivity = () => {
            if (!throttleTimeout) {
                updateLastActivity();
                throttleTimeout = setTimeout(() => {
                    throttleTimeout = null;
                }, 1000); // Only update at most once per second
            }
        };

        events.forEach((event) => {
            window.addEventListener(event, handleActivity, { passive: true });
        });

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (throttleTimeout) {
                clearTimeout(throttleTimeout);
            }
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [isAuthenticated, timeoutMs, onTimeout, updateLastActivity]);
};
