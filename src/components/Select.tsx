import React, { useEffect, useMemo, useRef, useState } from "react";

type Item = { label: React.ReactNode; href?: string; onClick?: () => void };

export default function Dropdown(
    props: {
        id?: string;
        items: Item[];
        label: React.ReactNode;
        className?: string;
        disabled?: boolean;
    }
) {
    const items: Item[] = useMemo(
        () => props.items,
        []
    );

    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(items.map((_, i) => i).indexOf(0));

    const wrapRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

    const close = () => {
        setOpen(false);
        setActiveIndex(-1);
    };

    const openAndFocus = (index: number) => {
        setOpen(true);
        setActiveIndex(index);
    };

    // Outside click + ESC
    useEffect(() => {
        function onMouseDown(e: MouseEvent) {
            if (!open) return;
            const target = e.target as Node;
            if (wrapRef.current && !wrapRef.current.contains(target)) {
                close();
            }
        }

        function onKeyDown(e: KeyboardEvent) {
            if (!open) return;
            if (e.key === "Escape") {
                e.preventDefault();
                close();
                buttonRef.current?.focus();
            }
        }

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    // Focus the active item when it changes
    useEffect(() => {
        if (!open) return;
        if (activeIndex < 0) return;
        itemRefs.current[activeIndex]?.focus();
    }, [open, activeIndex]);

    const onButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            openAndFocus(0);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            openAndFocus(items.length - 1);
        } else if (e.key === "Enter" || e.key === " ") {
            // Space/Enter toggles
            e.preventDefault();
            setOpen((v) => !v);
            if (!open) setActiveIndex(0);
        }
    };

    const clampIndex = (idx: number) => {
        const max = items.length - 1;
        if (idx < 0) return max;
        if (idx > max) return 0;
        return idx;
    };

    const onMenuKeyDown = (e: React.KeyboardEvent) => {
        if (!open) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => clampIndex(i + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => clampIndex(i - 1));
        } else if (e.key === "Home") {
            e.preventDefault();
            setActiveIndex(0);
        } else if (e.key === "End") {
            e.preventDefault();
            setActiveIndex(items.length - 1);
        } else if (e.key === "Tab") {
            // allow normal tabbing but close the menu
            close();
        } else if (e.key === "Enter" || e.key === " ") {
            // Activate current item
            e.preventDefault();
            const el = itemRefs.current[activeIndex];
            el?.click();
        }
    };

    return (
        <div ref={wrapRef} id={props.id} key={props.id} className={`relative inline-block text-left w-fit ${props.className ?? ''}`}>
            <button
                ref={buttonRef}
                type="button"
                onClick={() => {
                    setOpen((v) => !v);
                    if (!open) setActiveIndex(0);
                }}
                onKeyDown={onButtonKeyDown}
                aria-haspopup="menu"
                aria-expanded={open}
                disabled={props.disabled}
                className="inline-flex items-center justify-center rounded-md bg-slate-600 px-4 py-2.5 text-sm font-medium leading-5 text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:opacity-40 disabled:hover:bg-slate-600"
            >
                {props.label}
                <svg
                    className={`ms-1.5 h-4 w-4 transition-transform duration-150 ${open ? "rotate-180" : "rotate-0"
                        }`}
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                >
                    <path
                        d="m19 9-7 7-7-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {/* Menu panel */}
            <div
                role="menu"
                aria-label="Dropdown menu"
                onKeyDown={onMenuKeyDown}
                className={[
                    "absolute left-0 mt-2 w-44 origin-top-right rounded-md border border-gray-800 bg-white shadow-lg z-10",
                    "outline-none",
                    // animation
                    "transition duration-150 ease-out",
                    open
                        ? "pointer-events-auto scale-100 opacity-100"
                        : "pointer-events-none scale-95 opacity-0",
                ].join(" ")}
            >
                <ul className="p-2 text-sm font-medium text-gray-100 bg-slate-800">
                    {items.map((item, idx) => (
                        <li key={idx}>
                            <a
                                ref={(el) => {
                                    itemRefs.current[idx] = el;
                                }}
                                href={item.href ?? "#"}
                                role="menuitem"
                                tabIndex={open ? 0 : -1}
                                onClick={(ev) => {
                                    // ha csak demo #, ne ugorjon fel a lap tetejére
                                    if ((item.href ?? "#") === "#") ev.preventDefault();
                                    item.onClick?.();
                                    close();
                                    buttonRef.current?.focus();
                                }}
                                onMouseEnter={() => setActiveIndex(idx)}
                                className={[
                                    "inline-flex w-full items-center rounded px-2 py-2",
                                    "focus:outline-none",
                                    "hover:bg-gray-700 hover:text-gray-100"
                                ].join(" ")}
                            >
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
