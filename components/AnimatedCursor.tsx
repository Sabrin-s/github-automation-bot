'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const sparkContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const trail = trailRef.current;
    const sparkContainer = sparkContainerRef.current;
    if (!cursor || !trail || !sparkContainer) return;

    // Skip on touch-only devices
    if ('ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) {
      return;
    }

    let mouseX = 0;
    let mouseY = 0;
    let trailX = 0;
    let trailY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
    };

    // Smooth trailing animation
    const animate = () => {
      trailX += (mouseX - trailX) * 0.15;
      trailY += (mouseY - trailY) * 0.15;
      trail.style.left = `${trailX}px`;
      trail.style.top = `${trailY}px`;
      requestAnimationFrame(animate);
    };

    const handleMouseEnter = () => {
      cursor.style.opacity = '1';
      trail.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      cursor.style.opacity = '0';
      trail.style.opacity = '0';
    };

    // Expand cursor on hover over interactive elements
    const handlePointerOver = (e: Event) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a') ||
        target.style.cursor === 'pointer' ||
        window.getComputedStyle(target).cursor === 'pointer'
      ) {
        cursor.classList.add('cursor-hover');
        trail.classList.add('trail-hover');
      }
    };

    const handlePointerOut = () => {
      cursor.classList.remove('cursor-hover');
      trail.classList.remove('trail-hover');
    };

    // ✨ Spark effect on click
    const handleClick = (e: MouseEvent) => {
      const sparkCount = 8;
      const colors = [
        'hsla(263, 90%, 65%, 1)',
        'hsla(217, 91%, 65%, 1)',
        'hsla(280, 80%, 70%, 1)',
        'hsla(200, 90%, 70%, 1)',
        'hsla(320, 80%, 65%, 1)',
        'hsla(45, 100%, 70%, 1)',
      ];

      for (let i = 0; i < sparkCount; i++) {
        const spark = document.createElement('div');
        spark.className = 'cursor-spark';

        // Random angle and distance
        const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.5;
        const distance = 30 + Math.random() * 40;
        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;
        const size = 3 + Math.random() * 4;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const duration = 400 + Math.random() * 300;

        spark.style.cssText = `
          position: fixed;
          left: ${e.clientX}px;
          top: ${e.clientY}px;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          box-shadow: 0 0 6px ${color}, 0 0 12px ${color};
          pointer-events: none;
          z-index: 99997;
          transform: translate(-50%, -50%);
          opacity: 1;
          transition: none;
        `;

        sparkContainer.appendChild(spark);

        // Animate the spark outward and fade
        requestAnimationFrame(() => {
          spark.style.transition = `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
          spark.style.left = `${e.clientX + dx}px`;
          spark.style.top = `${e.clientY + dy}px`;
          spark.style.opacity = '0';
          spark.style.width = '1px';
          spark.style.height = '1px';
        });

        // Remove element after animation
        setTimeout(() => {
          spark.remove();
        }, duration + 50);
      }

      // Brief pulse on the cursor dot
      cursor.classList.add('cursor-click');
      setTimeout(() => cursor.classList.remove('cursor-click'), 300);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseover', handlePointerOver);
    document.addEventListener('mouseout', handlePointerOut);
    document.addEventListener('click', handleClick);

    animate();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseover', handlePointerOver);
      document.removeEventListener('mouseout', handlePointerOut);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Don't render on touch-only devices
  if (typeof window !== 'undefined' && 'ontouchstart' in window && !window.matchMedia('(pointer: fine)').matches) {
    return null;
  }

  return (
    <>
      {/* Main cursor dot */}
      <div
        ref={cursorRef}
        style={{
          position: 'fixed',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, hsl(263, 90%, 60%), hsl(217, 91%, 60%))',
          pointerEvents: 'none',
          zIndex: 99999,
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.2s ease, height 0.2s ease, opacity 0.3s ease',
          boxShadow: '0 0 10px hsla(263, 90%, 60%, 0.6), 0 0 20px hsla(263, 90%, 60%, 0.3)',
          opacity: 0,
          mixBlendMode: 'screen',
        }}
        className="custom-cursor-dot"
      />
      {/* Trailing glow ring */}
      <div
        ref={trailRef}
        style={{
          position: 'fixed',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1.5px solid hsla(263, 90%, 60%, 0.35)',
          pointerEvents: 'none',
          zIndex: 99998,
          transform: 'translate(-50%, -50%)',
          transition: 'width 0.3s ease, height 0.3s ease, border-color 0.3s ease, opacity 0.3s ease',
          opacity: 0,
          mixBlendMode: 'screen',
        }}
        className="custom-cursor-trail"
      />
      {/* Container for spark particles */}
      <div ref={sparkContainerRef} style={{ position: 'fixed', top: 0, left: 0, pointerEvents: 'none', zIndex: 99997 }} />
    </>
  );
}
