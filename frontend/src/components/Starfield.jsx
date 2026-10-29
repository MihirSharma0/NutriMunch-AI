/**
 * Interactive Background Starfield
 * Canvas animation component rendering an interactive starfield with physics-driven particles
 * responsive to window dimensions and mouse cursor movement.
 */
import React, { useEffect, useRef } from 'react';

/**
 * Starfield Component
 * Renders an animated particle field simulating a starry cosmic space environment.
 */
const Starfield = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        
        let width = window.innerWidth;
        let height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;

        const particles = [];
        const numParticles = 1500;
        let mouse = { x: -1000, y: -1000 };

        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.5 + 0.5,
                baseX: Math.random() * width,
                baseY: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                color: `rgba(220, 255, 255, ${Math.random() * 0.7 + 0.1})`
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
                    // Pull and swirl slightly towards the mouse
                    p.x += (dx / distance) * force * 1.5 + (dy / distance) * force * 1.0;
                    p.y += (dy / distance) * force * 1.5 - (dx / distance) * force * 1.0;
                    p.color = `rgba(180, 255, 255, ${Math.min(1, Math.random() * 0.5 + 0.5)})`;
                } else {
                    p.color = `rgba(220, 255, 255, ${Math.random() * 0.5 + 0.1})`;
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
            className="absolute inset-0 pointer-events-none z-0 mix-blend-screen opacity-80"
        />
    );
};

export default Starfield;
