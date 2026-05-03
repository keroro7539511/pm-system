import { useEffect, useRef, useState } from "react";

export function useCountUp(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    start.current = null;

    const step = (timestamp: number) => {
      if (!start.current) start.current = timestamp;
      const elapsed = timestamp - start.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf.current = requestAnimationFrame(step);
      }
    };

    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}
