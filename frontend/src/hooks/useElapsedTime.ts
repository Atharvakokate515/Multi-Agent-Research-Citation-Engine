import { useState, useEffect, useRef } from 'react';

export function useElapsedTime(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setElapsed(0);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(((Date.now() - startRef.current) / 1000));
    }, 100);
    return () => clearInterval(id);
  }, [running]);

  return elapsed;
}
