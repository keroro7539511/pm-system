import { useState, useEffect } from "react";

function isLightTheme() {
  return document.documentElement.dataset.theme === "light";
}

export function useChartColors() {
  const [light, setLight] = useState(isLightTheme);

  useEffect(() => {
    const obs = new MutationObserver(() => setLight(isLightTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  return {
    tickFill:      light ? "#64748B" : "#E2E8F0",
    labelFill:     light ? "#475569" : "#F1F5F9",
    gridStroke:    light ? "rgba(15,23,42,0.07)" : "rgba(255,255,255,0.06)",
    tooltipBg:     light ? "#FFFFFF"             : "#0F1628",
    tooltipBorder: light ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.09)",
    tooltipColor:  light ? "#1E293B"             : "#F1F5F9",
  };
}
