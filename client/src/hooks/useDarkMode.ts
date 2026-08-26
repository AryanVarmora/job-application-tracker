import { useEffect, useState } from "react";

// Dark is the designed default experience (light is an opt-in toggle), so a first-time
// visitor starts in dark mode regardless of OS preference; only an explicit prior choice
// in this app overrides that.
function getInitial(): boolean {
  const stored = localStorage.getItem("theme");
  if (stored) return stored === "dark";
  return true;
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((prev) => !prev) };
}
