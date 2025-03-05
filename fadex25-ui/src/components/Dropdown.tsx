import React, { useState, useEffect, useRef } from 'react';

// Interface for Dropdown props
interface DropdownProps {
  options: string[]; // List of options (e.g., Perp Markets or Indicators)
  // Removed 'selected' and 'onSelect' to match MarketData.tsx usage
  onSelectionChange: (selected: string[]) => void; // Handler for multiple selections
  label: string; // Label for the dropdown button (e.g., "Select a Perp Market")
  // Placeholder for API/input function (to be implemented as needed)
  // onApiFetch?: () => Promise<void>; // Uncomment and define if fetching data dynamically
}

/**
 * Reusable Dropdown component with checkbox selection and "Select All" functionality.
 * Maintains open state when interacting with "Select All" checkbox.
 */
export default function Dropdown({ options, onSelectionChange, label }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]); // Local state for selected options
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        // Check if the click is not on the "Select All" checkbox or its label
        const selectAllElement = dropdownRef.current.querySelector('.selectAllInline');
        if (selectAllElement && !selectAllElement.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(options);
      onSelectionChange(options); // Notify parent of all selections
    } else {
      setSelected([]);
      onSelectionChange([]); // Notify parent of no selections
    }
  };

  const handleOptionSelect = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    setSelected(newSelected);
    onSelectionChange(newSelected); // Notify parent of updated selections
  };

  return (
    <div className="dropdownContainer" ref={dropdownRef}>
      <button className="dropdownButton" onClick={() => setIsOpen(!isOpen)}>
        {label}
      </button>
      {isOpen && (
        <div className={`dropdownContent dropdownDown`} style={{ maxHeight: Math.max(300, options.length * 20) + 'px' }}>
          <label className="selectAllInline">
            <input type="checkbox" checked={selected.length === options.length} onChange={handleSelectAll} />
            Select All
          </label>
          {options.map(option => (
            <label key={option} className="dropdownItem">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => handleOptionSelect(option)}
              />
              {option}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}