// A choice of one among a few, as the mockups' segmented controls: a group
// of toggle buttons, one pressed, with a label for assistive technology.

import { ToggleButton, ToggleButtonGroup } from 'react-aria-components';

export default function Segmented({ label, value, options, onChange, className = '', size = '' }) {
  return (
    <ToggleButtonGroup
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [k] = [...keys];
        if (k !== undefined && k !== value) onChange(k);
      }}
      className={`segmented ${size} ${className}`}
    >
      {options.map((o) => (
        <ToggleButton key={o.value} id={o.value} isDisabled={o.disabled} className="segment">
          {o.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
