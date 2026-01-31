import { useState, ReactNode } from 'react';

interface TabsProps {
  children: ReactNode;
  defaultTab?: number;
}

interface TabProps {
  label: string;
  children: ReactNode;
}

export function Tab({ children }: TabProps) {
  return <>{children}</>;
}

export default function Tabs({ children, defaultTab = 0 }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Extract tab labels and content from children
  const tabs = Array.isArray(children) ? children : [children];
  const tabLabels = tabs.map((tab) => tab.props.label);
  const tabContents = tabs.map((tab) => tab.props.children);

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b border-[var(--color-border)] mb-6">
        <div className="flex gap-1">
          {tabLabels.map((label, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`
                px-4 py-3 font-medium transition-colors relative
                ${
                  activeTab === index
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                }
              `}
            >
              {label}
              {activeTab === index && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {tabContents[activeTab]}
      </div>
    </div>
  );
}
