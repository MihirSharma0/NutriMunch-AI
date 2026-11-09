/**
 * Interactive Background Starfield
 * Canvas animation component rendering an interactive starfield with physics-driven particles
 * responsive to window dimensions, mouse cursor movement, and active theme (dark / light).
 */
import React, { useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Starfield Component
 * Renders an animated particle field simulating a starry cosmic space environment in dark mode,
 * and elegant floating dark particles in light mode.
 */
const Starfield = () => {
    const { isDark } = useTheme();
    const canvasRef = useRef(null);
    const isDarkRef = useRef(isDark);

    useEffect(() => {
        isDarkRef.current = isDark;
    }, [isDark]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const particles = [];
        const numParticles = 1400;
        let mouse = { x: -1000, y: -1000 };

        for (let i = 0; i < numParticles; i++) {
            const isDarkNow = isDarkRef.current;
            const alpha = Math.random() * 0.7 + 0.15;
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.6 + 0.4,
                baseX: Math.random() * width,
                baseY: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                color: isDarkNow
                    ? `rgba(220, 255, 255, ${alpha})`
                    : `rgba(15, 23, 42, ${alpha * 0.7 + 0.2})`
            });
        }

        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
        };

        const handleMouseMove = (e) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const handleMouseLeave = () => {
            mouse.x = -1000;
            mouse.y = -1000;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);

        const animate = () => {
            ctx.clearRect(0, 0, width, height);
            const isDarkCurrent = isDarkRef.current;
            
            for (let i = 0; i < numParticles; i++) {
                let p = particles[i];
                
                // Base Drift
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                // Mouse Interaction (Comet trail / Swirl)
                let dx = mouse.x - p.x;
                let dy = mouse.y - p.y;
                let distance = Math.sqrt(dx * dx + dy * dy);
                let maxDistance = 200;

                if (distance < maxDistance) {
                    let force = (maxDistance - distance) / maxDistance;
                    p.x += (dx / distance) * force * 1.5 + (dy / distance) * force * 1.0;
                    p.y += (dy / distance) * force * 1.5 - (dx / distance) * force * 1.0;

                    if (isDarkCurrent) {
                        p.color = `rgba(180, 255, 255, ${Math.min(1, Math.random() * 0.5 + 0.5)})`;
                    } else {
                        // Dark black/navy particles swirl around cursor in light mode
                        p.color = `rgba(2, 6, 23, ${Math.min(0.95, Math.random() * 0.4 + 0.55)})`;
                    }
                } else {
                    if (isDarkCurrent) {
                        p.color = `rgba(220, 255, 255, ${Math.random() * 0.5 + 0.15})`;
                    } else {
                        // Dark slate / black stars in light mode
                        p.color = `rgba(15, 23, 42, ${Math.random() * 0.45 + 0.2})`;
                    }
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas 
            ref={canvasRef} 
            className={`absolute inset-0 pointer-events-none z-0 transition-opacity duration-500 ${
                isDark 
                    ? 'mix-blend-screen opacity-80' 
                    : 'mix-blend-multiply opacity-75'
            }`}
        />
    );
};

export default Starfield;
