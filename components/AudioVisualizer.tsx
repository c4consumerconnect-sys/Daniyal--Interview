import React, { useEffect, useRef } from 'react';

interface Props {
  volume: number; // 0 to 1
  active: boolean;
}

const AudioVisualizer: React.FC<Props> = ({ volume, active }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  const smoothVol = useRef(0);

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear with a slight fade effect or full clear
    ctx.clearRect(0, 0, width, height);

    // Smooth volume transition: quick rise, slow decay
    const target = volume;
    if (target > smoothVol.current) {
      smoothVol.current += (target - smoothVol.current) * 0.3;
    } else {
      smoothVol.current += (target - smoothVol.current) * 0.05;
    }

    // If inactive and volume is low, draw a flat line
    if (!active && smoothVol.current < 0.01) {
       ctx.beginPath();
       ctx.moveTo(0, height / 2);
       ctx.lineTo(width, height / 2);
       ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)'; // Slate-400 low opacity
       ctx.lineWidth = 2;
       ctx.stroke();
       
       requestRef.current = requestAnimationFrame(animate);
       return;
    }

    const drawWave = (color: string, frequency: number, speed: number, offset: number) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      // Round joins for smoother look
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      const t = Date.now() * 0.002 * speed;
      const centerY = height / 2;
      
      // Dynamic amplitude scaling
      // Base size + volume boost. Scale factor ensures it fits in height
      const maxAmp = (height / 2) - 10;
      const amplitude = 10 + (smoothVol.current * maxAmp * 1.5); 

      for (let x = 0; x < width; x+=2) { // Step by 2 for performance
        // Normalized X (0 to 1)
        const normX = x / width;
        
        // Tapering function (Sine window) to keep edges pinned to center
        const taper = Math.sin(Math.PI * normX);
        
        // Wave equation
        const y = centerY + Math.sin(x * frequency + t + offset) * amplitude * taper;
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Draw 3 overlapping waves with different frequencies and speeds for a "voice" effect
    drawWave('rgba(129, 140, 248, 0.8)', 0.015, 1.2, 0);   // Indigo
    drawWave('rgba(192, 132, 252, 0.6)', 0.02, 1.5, 2);    // Purple
    drawWave('rgba(56, 189, 248, 0.5)', 0.01, 0.8, 4);     // Light Blue

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [volume, active]);

  return (
    <canvas 
      ref={canvasRef} 
      width={800} 
      height={300} 
      className="w-full h-full"
    />
  );
};

export default AudioVisualizer;