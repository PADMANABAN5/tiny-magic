import React, { useRef, useEffect } from "react";

const AudioVoiceVisualizer = ({ analyser, isActive }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!analyser || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.fftSize = 256; // fewer bars = smoother
    analyser.smoothingTimeConstant = 0.8;

    const draw = () => {
      if (!isActive) return;
      requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = 3;
      const gap = 1;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      const centerY = canvas.height / 2;

      for (let i = 0; i < totalBars; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const fullBarHeight = canvas.height * percent;
        const halfHeight = fullBarHeight / 2;

        const x = i * (barWidth + gap);

        // Draw upper bar (above center)
        if (halfHeight > 0) {
          const upperY = centerY - halfHeight;
          const gradientUpper = ctx.createLinearGradient(0, upperY, 0, centerY);
          gradientUpper.addColorStop(0, "#000000ff");
          gradientUpper.addColorStop(1, "#000000ff");
          ctx.fillStyle = gradientUpper;
          ctx.fillRect(x, upperY, barWidth, halfHeight);
        }

        // Draw lower bar (below center)
        if (halfHeight > 0) {
          const lowerY = centerY;
          const gradientLower = ctx.createLinearGradient(0, centerY, 0, centerY + halfHeight);
          gradientLower.addColorStop(0, "#000000ff");
          gradientLower.addColorStop(1, "#000000ff");
          ctx.fillStyle = gradientLower;
          ctx.fillRect(x, lowerY, barWidth, halfHeight);
        }
      }
    };

    draw();
  }, [analyser, isActive]);

 return (
    <canvas
      ref={canvasRef}
      width={500}
      height={75}
      style={{
       position: 'absolute',
        top: 0,
        left:  3,
        width: '100%',
        height: '100%',
        border: 'none',
        borderRadius: 'inherit', // Inherit rounded corners from .chat-input / .voice-visualizer-only
        backgroundColor: 'transparent', // Fully transparent to overlay on chat-input background
        boxShadow: 'none',
        display: 'block',
        pointerEvents: 'none', // Allow clicks to pass through if overlaid
        outline: 'none',
      }}
    />
  );
};

export default AudioVoiceVisualizer;