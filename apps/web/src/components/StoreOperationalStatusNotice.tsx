import React from 'react';
import { PauseCircle } from 'lucide-react';

interface StoreOperationalStatusNoticeProps {
  reason?: string | null;
  expectedReopenAt?: string | null;
  timezone?: string | null;
  className?: string;
}

export const StoreOperationalStatusNotice: React.FC<StoreOperationalStatusNoticeProps> = ({
  reason,
  expectedReopenAt,
  timezone = 'Asia/Manila',
  className = '',
}) => {
  const reopenDate = expectedReopenAt ? new Date(expectedReopenAt) : null;
  const formattedReopenAt = reopenDate && Number.isFinite(reopenDate.getTime())
    ? new Intl.DateTimeFormat('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: timezone || 'Asia/Manila',
      }).format(reopenDate)
    : null;

  return (
    <div
      role="status"
      className={`rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs font-bold">
        <PauseCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <span>Temporarily closed</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed">
        {reason?.trim() || 'This store is temporarily closed and is not accepting new appointments.'}
      </p>
      <p className="mt-1 text-[10px] font-medium text-amber-800 dark:text-amber-200">
        {formattedReopenAt
          ? `Expected to reopen ${formattedReopenAt} (${timezone || 'Asia/Manila'}).`
          : 'The reopening time has not been estimated yet.'}
      </p>
    </div>
  );
};
