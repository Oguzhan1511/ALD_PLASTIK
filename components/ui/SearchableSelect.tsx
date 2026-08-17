"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  id: string;
  name: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string;
  onChange?: (val: string) => void;
  name?: string;
  placeholder?: string;
  required?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  name,
  placeholder = "Seçin...",
  required,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [internalValue, setInternalValue] = useState(value || "");
  const wrapperRef = useRef<HTMLDivElement>(null);

  const currentValue = value !== undefined ? value : internalValue;
  const selectedOption = options.find((o) => o.id === currentValue);

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id: string, disabled?: boolean) => {
    if (disabled) return;
    setInternalValue(id);
    setSearch("");
    setIsOpen(false);
    if (onChange) onChange(id);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {name && <input type="hidden" name={name} value={currentValue} />}
      
      <div 
        className="flex items-center justify-between w-full cursor-pointer bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
        onClick={() => setIsOpen(true)}
      >
        {!isOpen && selectedOption ? (
           <div className="px-3 py-1.5 sm:py-2 text-sm text-slate-700 flex-1 min-w-0 h-[34px] sm:h-[38px] flex items-center">
             <span className="truncate block w-full">{selectedOption.name}</span>
           </div>
        ) : (
          <div className="flex-1 min-w-0 h-[34px] sm:h-[38px] flex items-center">
            <input
              type="text"
              className="w-full px-3 py-1.5 sm:py-2 text-sm outline-none bg-transparent"
              placeholder={selectedOption ? selectedOption.name : placeholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              required={required && !currentValue}
            />
          </div>
        )}
        
        <div className="px-2 text-slate-400 bg-white flex-shrink-0 flex items-center">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-slate-500">Sonuç bulunamadı.</div>
          ) : (
            <ul>
              {filteredOptions.map((o) => (
                <li
                  key={o.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(o.id, o.disabled);
                  }}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    o.disabled 
                      ? "text-slate-400 bg-slate-50 cursor-not-allowed" 
                      : o.id === currentValue 
                        ? "bg-blue-50 text-blue-700 font-medium" 
                        : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {o.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
