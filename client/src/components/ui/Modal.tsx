import { useEffect, type ReactNode } from "react";

interface Props {
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ onClose, children }: Props) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="animate-overlay-in fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/40 p-4 pt-12 backdrop-blur-md dark:bg-slate-950/70"
      onClick={onClose}
    >
      <div
        className="animate-modal-in w-full max-w-2xl rounded-2xl border border-slate-200/60 bg-white/90 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/80 dark:shadow-black/50 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
