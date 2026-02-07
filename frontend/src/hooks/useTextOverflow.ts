import { useRef, useEffect, useState } from 'react';

/**
 * Hook to detect text overflow and provide tooltip support
 * Returns a ref to attach to the element and a title for native tooltip
 */
export function useTextOverflow() {
  const ref = useRef<HTMLElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [fullText, setFullText] = useState('');

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const checkOverflow = () => {
      // Check if content is wider than container (horizontal overflow)
      const isOverflow = element.scrollWidth > element.clientWidth ||
                        element.scrollHeight > element.clientHeight;
      setIsOverflowing(isOverflow);
      if (isOverflow) {
        setFullText(element.textContent || '');
      }
    };

    // Check on mount and window resize
    checkOverflow();
    window.addEventListener('resize', checkOverflow);

    // Also check when content changes
    const observer = new MutationObserver(checkOverflow);
    observer.observe(element, { childList: true, subtree: true, characterData: true });

    return () => {
      window.removeEventListener('resize', checkOverflow);
      observer.disconnect();
    };
  }, []);

  return {
    ref,
    isOverflowing,
    title: isOverflowing ? fullText : undefined
  };
}
