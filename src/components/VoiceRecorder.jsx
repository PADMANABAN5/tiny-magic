import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import axios from "axios";
import { toast } from "react-toastify";
import "../styles/dashboard.css";

const BASE_URL = process.env.REACT_APP_API_LINK;

const VoiceRecorder = forwardRef(
  (
    {
      onTranscription,
      disabled = false,
      // ✅ NEW optional callbacks so parent can react to mic state
      onRecordingStart,
      onRecordingStop,
      onRecordingChange,
    },
    ref
  ) => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const silenceStartRef = useRef(null);
    const analyserRef = useRef(null);
    const bandpassRef = useRef(null);
    const audioStreamRef = useRef(null);
    const audioContextRef = useRef(null);
    const rafRef = useRef(null);
    const speechStartRef = useRef(null);
    const hasSpokenRef = useRef(false);
    const autoStoppedRef = useRef(false);
    const cumulativeSpeechMsRef = useRef(0);
    const lastRmsAboveRef = useRef(null);

    // PARAMETERS TO TUNE
    const SILENCE_THRESHOLD = 0.018; // try 0.015/0.018/0.02 depending on your mic
    const MIN_SPEECH_MS = 500;
    const MAX_SILENCE_MS = 10000;
    const MAX_SPEECH_MS = 10000;

    useEffect(() => {
      onRecordingChange && onRecordingChange(isRecording);
      if (isRecording) onRecordingStart && onRecordingStart();
      else onRecordingStop && onRecordingStop();
    }, [isRecording, onRecordingStart, onRecordingStop, onRecordingChange]);

    const checkSilence = () => {
      if (!analyserRef.current) return;

      const bufferLength = analyserRef.current.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (dataArray[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / bufferLength);
      const now = Date.now();

      if (rms < SILENCE_THRESHOLD) {
        if (!silenceStartRef.current) silenceStartRef.current = now;
        else if (now - silenceStartRef.current > MAX_SILENCE_MS) {
          autoStoppedRef.current = true;
          stopRecording();
          toast.info("🎤 No speech detected — recording stopped.");
          return;
        }
        speechStartRef.current = null;
        lastRmsAboveRef.current = null;
      } else {
        if (!speechStartRef.current) speechStartRef.current = now;
        if (!lastRmsAboveRef.current) {
          lastRmsAboveRef.current = now;
        } else {
          const delta = now - lastRmsAboveRef.current;
          cumulativeSpeechMsRef.current += Math.max(0, delta);
          lastRmsAboveRef.current = now;
        }
        hasSpokenRef.current = true;
        if (now - speechStartRef.current > MAX_SPEECH_MS) {
          autoStoppedRef.current = false;
          stopRecording();
          toast.success("🗣️ Recording stopped after 10s of continuous speech.");
          return;
        }
        silenceStartRef.current = null;
      }

      rafRef.current = requestAnimationFrame(checkSilence);
    };

    const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        const mediaRecorder = new MediaRecorder(stream);
        chunksRef.current = [];
        hasSpokenRef.current = false;
        autoStoppedRef.current = false;
        cumulativeSpeechMsRef.current = 0;
        lastRmsAboveRef.current = null;
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          cancelAnimationFrame(rafRef.current);
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          // 1. Auto stop (no/long silence)
          if (autoStoppedRef.current) {
            setIsRecording(false);
            mediaRecorderRef.current = null;
            return;
          }
          // 2. Manual stop but not enough speech
          if (!hasSpokenRef.current || cumulativeSpeechMsRef.current < MIN_SPEECH_MS) {
            toast.info("🎤 No clear speech detected — recording stopped.");
            setIsRecording(false);
            mediaRecorderRef.current = null;
            return;
          }
          // 3. We have enough speech energy, send to backend
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          try {
            toast.info("⏳ Transcribing your voice...");
            const res = await axios.post(`${BASE_URL}/transcribe`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 120000,
            });
            const text = res?.data?.data?.transcription || "";
            if (text && text.trim()) {
              toast.success("Transcription complete!");
              onTranscription(text.trim());
            } else {
              toast.error("No clear English speech detected.");
            }
          } catch (err) {
            console.error("Upload error:", err);
            toast.error("❌ Error uploading audio.");
          } finally {
            setIsRecording(false);
            mediaRecorderRef.current = null;
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);              // ✅ triggers onRecordingStart
        toast.success("🎙️ Recording started. Speak now!");

        // Audio setup
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContextRef.current.createMediaStreamSource(stream);

        // Band-pass filter (human voice)
        const bandpass = audioContextRef.current.createBiquadFilter();
        bandpass.type = "bandpass";
        bandpass.frequency.value = 170;
        bandpass.Q.value = 1.5;
        bandpassRef.current = bandpass;

        const analyser = audioContextRef.current.createAnalyser();
        analyser.fftSize = 2048;

        source.connect(bandpass);
        bandpass.connect(analyser);
        analyserRef.current = analyser;

        await audioContextRef.current.resume();

        silenceStartRef.current = null;
        speechStartRef.current = null;
        rafRef.current = requestAnimationFrame(checkSilence);
      } catch (err) {
        console.error("Recording error:", err);
        toast.error("🎤 Microphone access denied or unavailable.");
      }
    };

    const stopRecording = () => {
      return new Promise((resolve) => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          setIsRecording(false);           // ✅ triggers onRecordingStop immediately
          resolve();
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
        aria-pressed={isRecording}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? (
          <div className="pulse-container">
            <FaMicrophoneSlash size={20} className="text-red-500 mic-icon-animate" />
          </div>
        ) : (
          <FaMicrophone size={20} className="text-green-500" />
        )}
      </div>
    );
  }
);

export default VoiceRecorder;