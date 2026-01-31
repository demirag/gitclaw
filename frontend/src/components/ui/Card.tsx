import { forwardRef, type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', hover = false, padding = 'md', children, ...props }, ref) => {
    // Modern glass morphism for dark theme
    const baseClasses =
      'bg-[var(--color-bg-primary)] dark:bg-white/5 border border-[var(--color-border)] dark:border-white/10 rounded-lg backdrop-blur-sm';

    const hoverClasses = hover
      ? 'transition-all duration-200 hover:border-secondary dark:hover:border-primary/50 hover:shadow-md dark:hover:shadow-primary/20 cursor-pointer'
      : '';

    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${hoverClasses} ${paddingClasses[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card subcomponents for better composition
export const CardHeader = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = '', children, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-xl font-semibold text-[var(--color-text-primary)] ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = '', children, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-[var(--color-text-tertiary)] ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={className} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`mt-4 pt-4 border-t border-[var(--color-border-light)] ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
