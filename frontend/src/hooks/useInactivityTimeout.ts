import { useEffect, useRef, useCallback } from 'react';

// Default timeout is 5 minutes in milliseconds
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

export const useInactivityTimeout = (
    onTimeout: () => void,
    isAuthenticated: boolean,
    timeoutMs: number = DEFAULT_TIMEOUT
) => {
    const lastActivityRef = useRef<number>(Date.now());
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Update the last activity timestamp
    const updateLastActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
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

        // We use an interval to periodically check if the user has been inactive.
        // This is much more robust and performant than clearing and resetting a timeout on every mouse movement.
        intervalRef.current = setInterval(() => {
            const currentTime = Date.now();
            if (currentTime - lastActivityRef.current >= timeoutMs) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
                onTimeout();
            }
        }, 10000); // Check every 10 seconds

        // Events that denote user activity, ahora basado en peticiones a la API
        const events = [
            'api-request'
        ];

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
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [isAuthenticated, timeoutMs, onTimeout, updateLastActivity]);
};
