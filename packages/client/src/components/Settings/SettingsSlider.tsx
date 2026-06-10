import React, { useRef } from 'react';
import { HAPTIC, vibrate } from '../../utils/haptics';
import { typographyClass } from '../../constants/typography';

export interface SettingsSliderProps {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  isDark?: boolean;
  rangeLabels?: [string, string];
  labelClassName?: string;
  disabled?: boolean;
}

export const SettingsSlider: React.FC<SettingsSliderProps> = ({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  isDark = false,
  rangeLabels,
  labelClassName,
  disabled = false,
}) => {
  const lastHapticValue = useRef(value);

  const handleChange = (next: number) => {
    if (next !== lastHapticValue.current) {
      lastHapticValue.current = next;
      vibrate(HAPTIC.nav);
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className={labelClassName}>{label}</p>
        <span className={`${typographyClass.body} text-ui-accent font-bold tabular-nums`}>
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => handleChange(parseInt(e.target.value, 10))}
        className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-ui-accent bg-ui-border disabled:opacity-40"
        style={{
          background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        }}
      />
      {rangeLabels ? (
        <div
          className={`flex justify-between ${typographyClass.label} opacity-30 ${labelClassName ?? ''}`}
        >
          <span>{rangeLabels[0]}</span>
          <span>{rangeLabels[1]}</span>
        </div>
      ) : null}
    </div>
  );
};
