import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
/**
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicHeight 400
 * @framerIntrinsicWidth 800
 */ export default function UnicornStudioEmbed({ projectId }) {
  const elementRef = useRef(null);
  const [currentFps, setCurrentFps] = useState(30);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setCurrentFps((prev) => (prev !== 1 ? 1 : prev));
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setCurrentFps(30), 200);
    };

    const scrollContainer = document.querySelector("main.content") || window;

    scrollContainer.addEventListener("scroll", handleScroll, {
      passive: true,
      capture: true,
    });

    if (scrollContainer !== window) {
      window.addEventListener("scroll", handleScroll, {
        passive: true,
        capture: true,
      });
    }

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (scrollContainer !== window) {
        window.removeEventListener("scroll", handleScroll);
      }
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    console.log("current FPS", currentFps);
  }, [currentFps]);

  useEffect(() => {
    const isEditingOrPreviewing = false;
    let animationInterval;

    const initializeScript = (callback) => {
      const existingScript = document.querySelector(
        'script[src^="https://cdn.unicorn.studio"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://cdn.unicorn.studio/v1.2.3/unicornStudio.umd.js";
        script.async = true;
        script.crossOrigin = "anonymous";
        script.onload = callback;
        document.head.appendChild(script);
      } else {
        callback();
      }
    };

    const initializeUnicornStudio = () => {
      const cacheBuster = isEditingOrPreviewing
        ? "?update=" + Math.random()
        : "";
      elementRef.current.setAttribute(
        "data-us-project",
        projectId + cacheBuster
      );
      if (window.UnicornStudio) {
        window.UnicornStudio.destroy();
        window.UnicornStudio.init().then((scenes) => {
          console.log(scenes);
        });
      }
    };

    if (projectId) {
      if (window.UnicornStudio) {
        initializeUnicornStudio();
      } else {
        initializeScript(initializeUnicornStudio);
      }
    }

    // Cleanup function
    return () => {
      if (animationInterval) {
        clearTimeout(animationInterval);
      }
    };
  }, [projectId]);
  return /*#__PURE__*/ _jsx("div", {
    ref: elementRef,
    "data-us-dpi": "1",
    "data-us-scale": "0.5",
    "data-us-fps": currentFps.toString(),
    "data-us-quality": "100%",
    "data-us-lazyload": "true",
    "data-us-production": "true",
    style: {
      width: "100%",
      height: "100%",
      willChange: "transform",
      transform: "translateZ(0)",
      pointerEvents: "none",
    },
  });
}
UnicornStudioEmbed.displayName = "Chroma Background";