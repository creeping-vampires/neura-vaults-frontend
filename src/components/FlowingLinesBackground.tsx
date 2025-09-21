import React, { useEffect, useRef } from 'react';
import { animate, createScope } from 'animejs';

export const FlowingLinesBackground: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scope = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = '';

    const colors = {
      primary: '#00D4AA',
      secondary: 'rgba(0, 212, 170, 0.15)',
      tertiary: 'rgba(0, 212, 170, 0.22)',
      quaternary: 'rgba(0, 212, 170, 0.24)',
      accent: 'rgba(0, 212, 170, 0.18)',
      grid: 'rgba(0, 212, 170, 0.15)',
      particle: 'rgba(0, 212, 170, 0.6)',
      glow: 'rgba(0, 212, 170, 0.3)'
    };

    const createFlowingLines = () => {
      for (let i = 0; i < 8; i++) {
        const line = document.createElement('div');
        line.className = `flowing-line top-right-${i}`;
        line.style.cssText = `
          position: absolute;
          width: 200px;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${colors.secondary}, transparent);
          top: ${5 + i * 8}%;
          right: ${-10 + i * 3}%;
          transform: rotate(${15 + i * 5}deg);
          opacity: 0.6;
          border-radius: 2px;
        `;
        container.appendChild(line);
      }


      for (let i = 0; i < 6; i++) {
        const line = document.createElement('div');
        line.className = `flowing-line bottom-right-${i}`;
        line.style.cssText = `
          position: absolute;
          width: 180px;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${colors.tertiary}, transparent);
          bottom: ${5 + i * 6}%;
          right: ${-5 + i * 2}%;
          transform: rotate(${-20 + i * 4}deg);
          opacity: 0.5;
          border-radius: 2px;
        `;
        container.appendChild(line);
      }


      for (let i = 0; i < 7; i++) {
        const line = document.createElement('div');
        line.className = `flowing-line bottom-left-${i}`;
        line.style.cssText = `
          position: absolute;
          width: 190px;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${colors.quaternary}, transparent);
          bottom: ${8 + i * 7}%;
          left: ${-8 + i * 3}%;
          transform: rotate(${20 - i * 4}deg);
          opacity: 0.55;
          border-radius: 2px;
        `;
        container.appendChild(line);
      }


      for (let i = 0; i < 4; i++) {
        const curve = document.createElement('div');
        curve.className = `curve-line curve-${i}`;
        curve.style.cssText = `
          position: absolute;
          width: 120px;
          height: 120px;
          border: 2px solid ${colors.accent};
          border-radius: 50%;
          border-left: transparent;
          border-bottom: transparent;
          top: ${10 + i * 20}%;
          right: ${5 + i * 8}%;
          transform: rotate(${i * 45}deg);
          opacity: 0.4;
        `;
        container.appendChild(curve);
      }


      for (let i = 0; i < 12; i++) {
        const gridLine = document.createElement('div');
        gridLine.className = `grid-line grid-${i}`;
        const isVertical = i % 2 === 0;
        gridLine.style.cssText = `
          position: absolute;
          ${isVertical ? 'width: 1px; height: 100px;' : 'width: 100px; height: 1px;'}
          background: ${colors.grid};
          top: ${20 + (i % 4) * 20}%;
          right: ${10 + Math.floor(i / 4) * 15}%;
          opacity: 0.3;
        `;
        container.appendChild(gridLine);
      }


      for (let i = 0; i < 150; i++) {
        const dot = document.createElement('div');
        dot.className = `moving-dot dot-${i}`;
        const size = Math.random() * 2 + 2;
        dot.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          background: rgba(0, 212, 170, ${0.3 + Math.random() * 0.3});
          border-radius: 50%;
          top: ${Math.random() * 90 + 5}%;
          left: ${Math.random() * 90 + 5}%;
          opacity: 0.5;
          box-shadow: 0 0 ${size * 2}px ${colors.glow};
        `;
        container.appendChild(dot);
      }
    };

    createFlowingLines();

    scope.current = createScope({ root: containerRef.current }).add(self => {
      animate('.flowing-line[class*="top-right"]', {
        scaleX: [0.8, 1.3, 0.8],
        opacity: [0.4, 0.8, 0.4],
        translateX: [-20, 20, -20],
        duration: 6000,
        loop: true,
        delay: (el, i) => i * 400,
        ease: 'inOut(3)'
      });


      animate('.flowing-line[class*="bottom-right"]', {
        scaleX: [0.9, 1.2, 0.9],
        opacity: [0.3, 0.7, 0.3],
        translateX: [-15, 15, -15],
        duration: 7000,
        loop: true,
        delay: (el, i) => i * 600,
        ease: 'inOut(2)'
      });


      animate('.flowing-line[class*="bottom-left"]', {
        scaleX: [0.85, 1.25, 0.85],
        opacity: [0.35, 0.75, 0.35],
        translateX: [15, -15, 15],
        duration: 6500,
        loop: true,
        delay: (el, i) => i * 500,
        ease: 'inOut(2.5)'
      });


      animate('.curve-line', {
        rotate: [0, 360],
        scale: [1, 1.1, 1],
        opacity: [0.2, 0.5, 0.2],
        duration: 15000,
        loop: true,
        delay: (el, i) => i * 2000,
        ease: 'linear'
      });


      animate('.grid-line', {
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.05, 1],
        duration: 4000,
        loop: true,
        delay: (el, i) => i * 300,
        ease: 'inOut(4)'
      });


      animate('.moving-dot', {
        translateY: (el, i) => [
          -40 + (i % 3) * 20, 
          40 - (i % 3) * 20, 
          -40 + (i % 3) * 20
        ],
        translateX: (el, i) => [
          -30 + (i % 4) * 15, 
          30 - (i % 4) * 15, 
          -30 + (i % 4) * 15
        ],
        opacity: [0.3, 0.7, 0.3],
        scale: [0.8, 1.2, 0.8],
        duration: (el, i) => 6000 + (i % 5) * 1000,
        loop: true,
        delay: (el, i) => i * 500,
        ease: 'inOut(3)'
      });

    });


    return () => {
      if (scope.current) {
        scope.current.revert();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ 
        zIndex: -1,
        background: 'transparent'
      }}
    />
  );
};