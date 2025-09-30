import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";

const BASE_URL = process.env.REACT_APP_API_LINK;

const VoiceRecorder = forwardRef(({ onTranscription, disabled=false }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const silenceStartRef = useRef(null);
  const analyserRef = useRef(null);
  const audioStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const rafRef = useRef(null);

  const checkSilence = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // compute volume
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / bufferLength);

    const SILENCE_THRESHOLD = 0.01; // adjust sensitivity
    const MAX_SILENCE_MS = 10000; // 10s

    if (rms < SILENCE_THRESHOLD) {
      if (!silenceStartRef.current) {
        silenceStartRef.current = Date.now();
      } else if (Date.now() - silenceStartRef.current > MAX_SILENCE_MS) {
        stopRecording();
        toast.info("🎤 Recording stopped due to 10s silence.");
      }
    } else {
      silenceStartRef.current = null; // reset if voice detected
    }

    rafRef.current = requestAnimationFrame(checkSilence);
  };

  const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioStreamRef.current = stream;

    const mediaRecorder = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      cancelAnimationFrame(rafRef.current);
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      if (chunksRef.current.length === 0) {
        setIsRecording(false);
        mediaRecorderRef.current = null;
        return;
      }

      const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      try {
        const res = await axios.post(`${BASE_URL}/transcribe`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (res.data.success) {
          onTranscription(res.data.data.transcription);
        } else {
          toast.error("Transcription failed. Please try again.");
        }
      } catch (err) {
        console.error("Upload error:", err);
        toast.error("Error uploading audio.");
      } finally {
        setIsRecording(false);
        mediaRecorderRef.current = null;
      }
    };

    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);

    // 🎤 setup analyser for silence detection
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContextRef.current.createMediaStreamSource(stream);
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    silenceStartRef.current = null;
    rafRef.current = requestAnimationFrame(checkSilence);
  } catch (err) {
    console.error("Recording error:", err);
    toast.error("Microphone access denied or not available.");
  }
};

const stopRecording = () => {
  return new Promise((resolve) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // ✅ Instantly update UI
      setIsRecording(false);

      // resolve immediately so Dashboard can continue
      resolve();

      // let the MediaRecorder finish and trigger onstop in background
      mediaRecorderRef.current.stop();
    } else {
      resolve();
    }
  });
};


  useImperativeHandle(ref, () => ({
    stopRecording,
  }));

 return (
  
<div
  className={`mic-button ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
  onClick={!disabled ? (isRecording ? stopRecording : startRecording) : undefined}
>
  {isRecording ? (
    <FaMicrophoneSlash size={20} className="text-red-500" />
  ) : (
    <FaMicrophone size={20} className="text-green-500" />
  )}
</div>

);
});

export default VoiceRecorder;
