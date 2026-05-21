import { useState, useEffect, useRef } from "react";
import type { URLStatus } from "@/lib/url-validation";

export function useUrlValidation(urls: string[]) {
  const [statuses, setStatuses] = useState<Record<string, URLStatus>>({});
  const [isPolling, setIsPolling] = useState(false);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!urls || urls.length === 0) {
      setStatuses({});
      return;
    }

    let isMounted = true;
    
    // Initial validation kick-off
    const startValidation = async () => {
      try {
        const res = await fetch("/api/validate-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
        });
        const data = await res.json();
        if (isMounted && data.results) {
          setStatuses(data.results);
          
          // Check if any are still pending
          const hasPending = Object.values(data.results).some(s => s === 'PENDING');
          if (hasPending) {
            setIsPolling(true);
          }
        }
      } catch (err) {
        console.error("Failed to start validation", err);
      }
    };
    
    startValidation();
    
    return () => {
      isMounted = false;
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [urls]);

  useEffect(() => {
    if (!isPolling) {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
      return;
    }

    let isMounted = true;

    const poll = async () => {
      try {
        const res = await fetch("/api/validate-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
        });
        const data = await res.json();
        
        if (isMounted && data.results) {
          setStatuses(data.results);
          
          const hasPending = Object.values(data.results).some(s => s === 'PENDING');
          if (!hasPending) {
            setIsPolling(false);
          }
        }
      } catch (err) {
        console.error("Failed to poll validation", err);
      }
    };

    pollInterval.current = setInterval(poll, 2000); // Poll every 2 seconds

    return () => {
      isMounted = false;
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [isPolling, urls]);

  const allDone = !isPolling && Object.keys(statuses).length === urls.length;
  
  return { statuses, isPolling, allDone };
}
