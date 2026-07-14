import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * SegmentedControl
 *
 * A smooth, animated toggle switch with a sliding active background.
 *
 * @param {Object[]} options
 * @param {string|number} options[].value
 * @param {React.ReactNode} options[].label
 * @param {string|number} value
 * @param {(value: string|number) => void} onChange
 * @param {string} [className]
 * @param {string} [ariaLabel]
 */
export default function SegmentedControl({ options, value, onChange, className = '', ariaLabel }) {
  const containerRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeIndex = options.findIndex((o) => String(o.value) === String(value));
    const buttons = container.querySelectorAll('button');
    const activeButton = buttons[activeIndex];

    if (activeButton) {
      setIndicator({
        left: activeButton.offsetLeft,
        width: activeButton.offsetWidth,
      });
    }
  }, [value, options]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative inline-flex items-center p-1 bg-ft-surface-2 border border-ft-border-hair rounded-xl shadow-sm ${className}`}
    >
      {/* Sliding active background */}
      <span
        className="absolute top-1 bottom-1 bg-white rounded-lg shadow-sm border border-ft-border-hair transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />

      {options.map((option) => {
        const isActive = String(option.value) === String(value);
        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative z-10 px-4 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 ${
              isActive ? 'text-ft-accent' : 'text-ft-text-2 hover:text-ft-text-1'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
