import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center py-16">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary-400/20 dark:bg-primary-500/10 rounded-full blur-3xl scale-150" />
        <div className="relative bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/30 p-6 rounded-2xl">
          <Icon className="h-16 w-16 text-primary-600 dark:text-primary-400" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-8">{subtitle}</p>
      {action && <div className="flex items-center gap-3">{action}</div>}
    </div>
  );
}
