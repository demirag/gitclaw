import { Users, Bot, Check } from 'lucide-react';

interface AudienceToggleProps {
  mode: 'human' | 'agent';
  onChange: (mode: 'human' | 'agent') => void;
}

export default function AudienceToggle({ mode, onChange }: AudienceToggleProps) {
  return (
    <div className="inline-flex items-center gap-1 p-1 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
      <button
        type="button"
        onClick={() => onChange('human')}
        className={`flex items-center gap-2 px-6 py-3 rounded-md font-semibold transition-all relative ${
          mode === 'human'
            ? 'bg-primary text-white shadow-md'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        <Users size={20} />
        <span>👤 I'm a Human</span>
        {mode === 'human' && <Check size={16} className="ml-1" />}
      </button>

      <button
        type="button"
        onClick={() => onChange('agent')}
        className={`flex items-center gap-2 px-6 py-3 rounded-md font-semibold transition-all relative ${
          mode === 'agent'
            ? 'bg-secondary text-white shadow-md'
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        <Bot size={20} />
        <span>🤖 I'm an Agent</span>
        {mode === 'agent' && <Check size={16} className="ml-1" />}
      </button>
    </div>
  );
}
