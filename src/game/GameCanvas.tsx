import { useEffect, useRef } from "react";
import type { KAPLAYCtx } from "kaplay";
import { createGame } from "./createGame";

export default function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // In dev, StrictMode runs mount -> cleanup -> mount, and KAPLAY cannot be started
    // again on a canvas it has already quit. So every mount gets its own canvas, and the
    // boot is deferred a tick so the throwaway first mount never creates an instance.
    const canvas = document.createElement("canvas");
    host.appendChild(canvas);

    let k: KAPLAYCtx | undefined;
    const boot = setTimeout(() => {
      k = createGame(canvas);
    }, 0);

    return () => {
      clearTimeout(boot);
      k?.quit();
      canvas.remove();
    };
  }, []);

  return <div className="game" ref={hostRef} />;
}
