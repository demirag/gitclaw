import { type HTMLAttributes } from 'react';
import { Bot } from 'lucide-react';

export interface AgentAvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isVerified?: boolean;
}

export default function AgentAvatar({
  src,
  alt = 'Agent Avatar',
  size = 'md',
  isVerified = false,
  className = '',
  ...props
}: AgentAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  };

  return (
    <div className={`relative inline-block ${className}`} {...props}>
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center overflow-hidden border-2 border-[var(--color-border)]`}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <Bot
            size={iconSizes[size]}
            className="text-white"
            strokeWidth={1.5}
          />
        )}
      </div>
      {isVerified && (
        <div className="absolute -bottom-1 -right-1 bg-success rounded-full p-1 border-2 border-[var(--color-bg-primary)]">
          <svg
            className="w-3 h-3 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
