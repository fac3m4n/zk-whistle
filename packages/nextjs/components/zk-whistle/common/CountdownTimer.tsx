"use client";

import { useEffect, useState } from "react";

type CountdownTimerProps = {
  targetTimestamp: number; // Unix timestamp when the timer expires
  onExpire?: () => void;
  className?: string;
};

/**
 * Countdown timer that displays time remaining until a deadline.
 * Used primarily by the HeartbeatManager to show time until switch triggers.
 */
export const CountdownTimer = ({ targetTimestamp, onExpire, className = "" }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = targetTimestamp - now;
      return remaining > 0 ? remaining : 0;
    };

    setTimeLeft(calculateTimeLeft());

    const interval = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining === 0) {
        onExpire?.();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp, onExpire]);

  const days = Math.floor(timeLeft / 86400);
  const hours = Math.floor((timeLeft % 86400) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const isUrgent = timeLeft < 3600; // less than 1 hour
  const isWarning = timeLeft < 86400 && !isUrgent; // less than 1 day

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className={`text-center ${isUrgent ? "text-error" : isWarning ? "text-warning" : "text-base-content"}`}>
        <span className="countdown font-mono text-2xl">
          <span style={{ "--value": days } as React.CSSProperties}>{days}</span>
        </span>
        <span className="text-xs block">days</span>
      </div>
      <span className="text-2xl">:</span>
      <div className={`text-center ${isUrgent ? "text-error" : isWarning ? "text-warning" : "text-base-content"}`}>
        <span className="countdown font-mono text-2xl">
          <span style={{ "--value": hours } as React.CSSProperties}>{hours}</span>
        </span>
        <span className="text-xs block">hours</span>
      </div>
      <span className="text-2xl">:</span>
      <div className={`text-center ${isUrgent ? "text-error" : isWarning ? "text-warning" : "text-base-content"}`}>
        <span className="countdown font-mono text-2xl">
          <span style={{ "--value": minutes } as React.CSSProperties}>{minutes}</span>
        </span>
        <span className="text-xs block">min</span>
      </div>
      <span className="text-2xl">:</span>
      <div className={`text-center ${isUrgent ? "text-error" : isWarning ? "text-warning" : "text-base-content"}`}>
        <span className="countdown font-mono text-2xl">
          <span style={{ "--value": seconds } as React.CSSProperties}>{seconds}</span>
        </span>
        <span className="text-xs block">sec</span>
      </div>
    </div>
  );
};
