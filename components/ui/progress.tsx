import * as React from 'react';

import { cn } from '@/lib/utils';

// Lightweight progress component without Radix dependency
const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: number }
>(({ className, value = 0, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative h-2 w-full overflow-hidden rounded-full bg-zinc-800',
      className
    )}
    {...props}
  >
    <div
      className="h-full w-full flex-1 bg-blue-500 transition-all duration-300 ease-in-out"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
));
Progress.displayName = 'Progress';

export { Progress };