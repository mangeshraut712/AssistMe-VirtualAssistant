/**
 * Audio Visualizer Component
 * Real-time Web Audio API visualization
 */

import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export const AudioVisualizer = ({ stream, isActive, isDark }) => {
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const analyserRef = useRef(null);
    const contextRef = useRef(null);

    useEffect(() => {
        if (!stream || !isActive || !canvasRef.current) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            const audioCtx = new AudioContext();
            contextRef.current = audioCtx;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            analyserRef.current = analyser;

            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            const bars = 7;

            const renderFrame = () => {
                animationRef.current = requestAnimationFrame(renderFrame);
                analyser.getByteFrequencyData(dataArray);

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const barWidth = 6;
                const gap = 4;
                const totalWidth = (barWidth * bars) + (gap * (bars - 1));
                const startX = (canvas.width - totalWidth) / 2;

                for (let i = 0; i < bars; i++) {
                    const index = Math.floor(i * (bufferLength / bars));
                    const value = dataArray[index];
                    const percent = value / 256;
                    const height = Math.max(8, percent * 40);

                    const x = startX + i * (barWidth + gap);
                    const y = (canvas.height - height) / 2;

                    ctx.fillStyle = isDark
                        ? `rgba(255, 255, 255, ${0.4 + percent * 0.6})`
                        : `rgba(0, 0, 0, ${0.4 + percent * 0.6})`;

                    ctx.beginPath();
                    ctx.roundRect(x, y, barWidth, height, 50);
                    ctx.fill();
                }
            };

            renderFrame();
        } catch (err) {
            console.error("Audio visualizer error:", err);
        }

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (contextRef.current) contextRef.current.close();
        };
    }, [stream, isActive, isDark]);

    if (!isActive) {
        return (
            <div className="flex items-center justify-center gap-1 h-12">
                {[...Array(7)].map((_, i) => (
                    <div key={i} className={cn('w-1.5 h-2 rounded-full opacity-20', isDark ? 'bg-white' : 'bg-black')} />
                ))}
            </div>
        );
    }

    return <canvas ref={canvasRef} width={80} height={48} />;
};
