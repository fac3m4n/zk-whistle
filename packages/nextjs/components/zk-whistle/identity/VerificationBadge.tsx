"use client";

import { CheckBadgeIcon, XCircleIcon } from "@heroicons/react/24/solid";

type VerificationBadgeProps = {
  isVerified: boolean;
  proofCount?: number;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "text-xs gap-1",
  md: "text-sm gap-1.5",
  lg: "text-base gap-2",
};

const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

/**
 * Verification badge showing a user's credential verification status.
 * Displays a green checkmark when verified with proof count,
 * or a muted indicator when unverified.
 */
export const VerificationBadge = ({ isVerified, proofCount = 0, size = "md" }: VerificationBadgeProps) => {
  if (isVerified) {
    return (
      <div className={`flex items-center ${sizeClasses[size]} text-success`}>
        <CheckBadgeIcon className={iconSizes[size]} />
        <span className="font-medium">Verified Source</span>
        {proofCount > 0 && (
          <span className="badge badge-success badge-sm">
            {proofCount} proof{proofCount > 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${sizeClasses[size]} text-base-content/40`}>
      <XCircleIcon className={iconSizes[size]} />
      <span>Unverified</span>
    </div>
  );
};
