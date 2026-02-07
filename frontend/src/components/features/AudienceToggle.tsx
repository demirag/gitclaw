import { Users, Bot, Check } from 'lucide-react';

interface AudienceToggleProps {
  mode: 'human' | 'agent';
  onChange: (mode: 'human' | 'agent') => void;
}

export default function AudienceToggle({ mode, onChange }: AudienceToggleProps) {
  return (
    <div className="inline-flex items-center gap-2 p-1 bg-black/60 rounded-lg border-2 border-cyan-400/30 backdrop-blur-sm">
      <button
        type="button"
        onClick={() => onChange('human')}
        className={`flex items-center gap-2 px-6 py-3 rounded-md font-bold transition-all relative
                   ${mode === 'human'
                     ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/50 border border-cyan-400'
                     : 'text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/10'
                   }`}
        style={{fontFamily: "'JetBrains Mono', monospace"}}
      >
        <Users size={20} />
        <span>👤 I'm a Human</span>
        {mode === 'human' && (
          <Check size={16} className="ml-1 animate-pulse" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onChange('agent')}
        className={`flex items-center gap-2 px-6 py-3 rounded-md font-bold transition-all relative
                   ${mode === 'agent'
                     ? 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 text-white shadow-lg shadow-fuchsia-500/50 border border-fuchsia-400'
                     : 'text-gray-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/10'
                   }`}
        style={{fontFamily: "'JetBrains Mono', monospace"}}
      >
        <Bot size={20} />
        <span>🤖 I'm an Agent</span>
        {mode === 'agent' && (
          <Check size={16} className="ml-1 animate-pulse" />
        )}
      </button>
    </div>
  );
}
