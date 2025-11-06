import React, { useRef, useEffect } from "react";

const AudioVoiceVisualizer = ({ analyser, isActive }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!analyser) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestAnimationFrame(draw);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isActive) return;

      analyser.getByteFrequencyData(dataArray);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = 4;
      const gap = 2;
      const centerX = width / 2;
      const centerY = height / 2;
      const totalBars = Math.floor(centerX / (barWidth + gap));

      for (let i = 0; i < totalBars; i++) {
        const value = dataArray[i];
        const scaled = (value / 255) * (height / 2);
        const xLeft = centerX - (i + 1) * (barWidth + gap);
        const xRight = centerX + i * (barWidth + gap);

        const gradient = ctx.createLinearGradient(0, centerY - scaled, 0, centerY + scaled);
        gradient.addColorStop(0, "#333434ff");  // ChatGPT green top
        gradient.addColorStop(1, "#000000ff");  // darker bottom
        ctx.fillStyle = gradient;

        ctx.fillRect(xLeft, centerY - scaled, barWidth, scaled * 2);
        ctx.fillRect(xRight, centerY - scaled, barWidth, scaled * 2);
      }
    };

    draw();
  }, [analyser, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={80}
      style={{
        width: "100%",
        height: "100%",
        background: "transparent",
        borderRadius: "inherit",
        display: "block",
        pointerEvents: "none",
      }}
    />
  );
};

export default AudioVoiceVisualizer;
