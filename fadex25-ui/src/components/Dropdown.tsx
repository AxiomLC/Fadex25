import React, { useState, useEffect, useRef } from 'react';

interface DropdownProps {
  label: string; // Label for the dropdown button (e.g., "Select a Perp Market"), customizable by the page
  onSelectionChange: (selected: string[]) => void; // Handler for notifying parent of selection changes
  options?: string[]; // Optional static list of options (page can provide or fetch dynamically)
  // Placeholder for API/input function (to be implemented by the page)
  // onFetchOptions?: () => Promise<string[]>; // Uncomment and define if page handles dynamic fetching
}

/**
 * Reusable Dropdown component with checkbox selection, "Select All" inside the popup, and customizable title/API.
 * Maintains modularity and doesn’t include page-specific output logs.
 */
export default function Dropdown({ label, onSelectionChange, options: initialOptions }: DropdownProps) {
  const [options, setOptions] = useState<string[]>(initialOptions || []);
  const [selected, setSelected] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Placeholder for API fetch—page can override with onFetchOptions or provide static options
    if (!initialOptions) {
      // Default to no fetch unless page specifies (for testing or static use)
      setOptions([]); // Initial empty state
    }
    // If page wants dynamic fetching, they’d pass onFetchOptions or handle it externally

    // Handle outside click detection, ensuring modularity
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [initialOptions]); // Re-run if initialOptions changes

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected([...options]); // Select all options
      onSelectionChange([...options]); // Notify parent of the change
    } else {
      setSelected([]); // Unselect all options
      onSelectionChange([]); // Notify parent of the change
    }
  };

  const handleOptionSelect = (option: string) => {
    setSelected(prev =>
      prev.includes(option) ? prev.filter(m => m !== option) : [...prev, option]
    );
    onSelectionChange(
      selected.includes(option) ? selected.filter(m => m !== option) : [...selected, option]
    );
  };

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Prevent default button behavior
    e.stopPropagation(); // Prevent event from bubbling up and triggering outside click
    setIsOpen(!isOpen); // Toggle dropdown open/closed state
  };

  return (
    <div className="dropdownContainer" ref={dropdownRef}>
      <button className="dropdownButton" onClick={handleButtonClick}>
        {label}
      </button>
      {isOpen && error && <p className="error">{error}</p>}
      {isOpen && !error && (
        <div className={`dropdownContent dropdownDown`} style={{ maxHeight: Math.max(300, options.length * 20) + 'px' }}>
          <label className="selectAllInline">
            <input
              type="checkbox"
              checked={selected.length === options.length}
              onChange={handleSelectAll}
              onClick={(e) => e.stopPropagation()} // Prevent "Select All" click from closing dropdown
            />
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