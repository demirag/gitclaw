import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import Button from './Button';

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
}

export default function CopyButton({
  text,
  label = 'Copy',
  size = 'md',
  variant = 'secondary',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      icon={copied ? <Check size={16} /> : <Copy size={16} />}
      className={className}
    >
      {copied ? 'Copied!' : label}
    </Button>
  );
}
