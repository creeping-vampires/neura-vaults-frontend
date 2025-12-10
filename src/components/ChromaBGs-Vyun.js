import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { RenderTarget, addPropertyControls, ControlType } from "framer";
/**
 * @framerDisableUnlink
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicHeight 400
 * @framerIntrinsicWidth 800
 */ export default function UnicornStudioEmbed({ projectId }) {
  const elementRef = useRef(null);
  useEffect(() => {
    const isEditingOrPreviewing = ["CANVAS", "PREVIEW"].includes(
      RenderTarget.current()
    );
    const initializeScript = (callback) => {
      const existingScript = document.querySelector(
        'script[src^="https://cdn.unicorn.studio"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://cdn.unicorn.studio/v1.2.3/unicornStudio.umd.js";
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
  }, [projectId]);
  return /*#__PURE__*/ _jsx("div", {
    ref: elementRef,
    "data-us-dpi": "1.0",
    "data-us-scale": "1",
    "data-us-fps": "10",
    "data-us-quality": "low",
    "data-us-lazyload": "true",
    "data-us-production": "true",
    style: {
      width: "100%",
      height: "100%",
      willChange: "transform",
      transform: "translateZ(0)",
    },
  });
}
UnicornStudioEmbed.displayName = "Chroma Background";
addPropertyControls(UnicornStudioEmbed, {
  projectId: {
    type: ControlType.Enum,
    title: "Type",
    options: ["lHlDvoJDIXCxxXVqTNOC"],
    optionTitles: ["Liquid"],
  },
});
export const __FramerMetadata__ = {
  exports: {
    default: {
      type: "reactComponent",
      name: "ChromaBGs-Vyun",
      slots: [],
      annotations: {
        framerSupportedLayoutWidth: "fixed",
        framerIntrinsicWidth: "800",
        framerContractVersion: "1",
        framerSupportedLayoutHeight: "fixed",
        framerIntrinsicHeight: "400",
        framerDisableUnlink: "*",
      },
    },
    __FramerMetadata__: { type: "variable" },
  },
};
//# sourceMappingURL=./ChromaBGs.map
