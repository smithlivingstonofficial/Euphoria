"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

export function HeroParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const parent = canvas.parentElement;
    let width = (canvas.width = parent?.clientWidth || window.innerWidth);
    let height = (canvas.height = parent?.clientHeight || 600);

    // Refined palette: softer on light bg
    const colors = ["#6366F1", "#4F46E5", "#06B6D4", "#3B82F6", "#7C3AED", "#0891B2"];
    const particleCount = Math.min(Math.floor(width / 22), 48);
    const particles: Particle[] = [];

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 130,
    };

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        size: Math.random() * 2.2 + 0.9,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.35 + 0.2,
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!parent) return;
      width = canvas.width = parent.clientWidth;
      height = canvas.height = parent.clientHeight;
    };

    window.addEventListener("resize", handleResize);
    parent?.addEventListener("mousemove", handleMouseMove);
    parent?.addEventListener("mouseleave", handleMouseLeave);

    const maxDistance = 118;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const time = Date.now() * 0.0005;

      // ─── Layer 1: Orbiting ambient gradient orbs ───
      const orb1X = (Math.sin(time * 0.9) * 0.22 + 0.42) * width;
      const orb1Y = (Math.cos(time * 0.7) * 0.18 + 0.38) * height;
      const g1 = ctx.createRadialGradient(orb1X, orb1Y, 0, orb1X, orb1Y, width * 0.42);
      g1.addColorStop(0, "rgba(79, 70, 229, 0.15)");
      g1.addColorStop(0.5, "rgba(99, 102, 241, 0.06)");
      g1.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, width, height);

      const orb2X = (Math.cos(time * 0.6) * 0.22 + 0.65) * width;
      const orb2Y = (Math.sin(time * 0.8) * 0.2 + 0.52) * height;
      const g2 = ctx.createRadialGradient(orb2X, orb2Y, 0, orb2X, orb2Y, width * 0.36);
      g2.addColorStop(0, "rgba(6, 182, 212, 0.13)");
      g2.addColorStop(0.5, "rgba(124, 58, 237, 0.05)");
      g2.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, width, height);

      const orb3X = (Math.sin(time * 0.5 + 1.8) * 0.2 + 0.25) * width;
      const orb3Y = (Math.cos(time * 1.1 + 0.5) * 0.15 + 0.65) * height;
      const g3 = ctx.createRadialGradient(orb3X, orb3Y, 0, orb3X, orb3Y, width * 0.28);
      g3.addColorStop(0, "rgba(124, 58, 237, 0.1)");
      g3.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, width, height);

      // ─── Layer 2: Subtle animated circuit-grid lines ───
      const gridSpacing = 52;
      const gridAlpha = 0.06 + Math.sin(time * 1.3) * 0.025;
      ctx.strokeStyle = "#6366F1";
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = gridAlpha;

      // Horizontal lines
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      // Vertical lines
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Small circuit-junction dots at grid intersections (every other)
      ctx.fillStyle = "#6366F1";
      ctx.globalAlpha = gridAlpha * 1.8;
      for (let y = 0; y < height; y += gridSpacing * 2) {
        for (let x = 0; x < width; x += gridSpacing * 2) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ─── Layer 3: Interactive particle mesh ───
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < mouse.radius) {
          const force = (1 - distMouse / mouse.radius) * 1.6;
          p.x -= (dxMouse / distMouse) * force;
          p.y -= (dyMouse / distMouse) * force;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const lineAlpha = (1 - dist / maxDistance) * 0.18;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      parent?.removeEventListener("mousemove", handleMouseMove);
      parent?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 opacity-75"
    />
  );
}
