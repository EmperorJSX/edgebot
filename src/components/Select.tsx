"use client";

// Custom select: trigger button + popover listbox. Replaces every native
// <select> (there must be none). Keyboard: Enter/Space/Arrows open, Arrows
// move, Home/End jump, Enter/Space pick, Escape closes. Colors are all theme
// tokens so it flips with dark mode.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export default function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className = "",
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const selected = options.find((o) => o.value === value);

  const openList = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    btnRef.current?.focus();
  };
  const pick = (i: number) => {
    onChange(options[i].value);
    close();
  };

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(active);
    } else if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className={"relative " + className}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-panel px-3 py-1.5 text-xs font-semibold tracking-wider text-fg transition-colors hover:border-accent/60 focus:border-accent/60 focus:outline-none"
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <ChevronDown
          size={14}
          className={"shrink-0 text-muted transition-transform " + (open ? "rotate-180" : "")}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <ul
            ref={listRef}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onListKey}
            className="absolute left-0 right-0 z-40 mt-1 max-h-56 overflow-auto rounded-md border border-line bg-panel py-1 shadow-2xl focus:outline-none"
          >
            {options.map((o, i) => (
              <li
                key={o.value}
                id={`${id}-${i}`}
                role="option"
                aria-selected={o.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(i)}
                className={
                  "flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-xs font-semibold tracking-wider " +
                  (i === active ? "bg-accent/10 text-accent" : "text-fg")
                }
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check size={13} className="shrink-0" />}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
