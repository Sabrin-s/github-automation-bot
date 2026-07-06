'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const trail = trailRef.current;
    if (!cursor || !trail) return;

    let mouseX = 0;
    let mouseY = 0;
    let trailX = 0;
    let trailY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // Instant position for the main dot
      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
    };

    // Smooth trailing animation
    const animate = () => {
      // Lerp (linear interpolation) for the trail
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

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseover', handlePointerOver);
    document.addEventListener('mouseout', handlePointerOut);

    animate();

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseover', handlePointerOver);
      document.removeEventListener('mouseout', handlePointerOut);
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
    </>
  );
}
