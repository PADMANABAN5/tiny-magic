import React, { useState, useRef, forwardRef, useImperativeHandle, useEffect } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { FiLoader, FiStopCircle, FiX, FiCheck } from "react-icons/fi";
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
      onTranscribingStart,
      onTranscribingEnd,
    },
    ref
  ) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
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
    const shouldTranscribeRef = useRef(true); // ✅ Flag to decide whether to transcribe on stop

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
          stopRecording(false); // Auto-stop doesn't cancel, but won't transcribe if flagged
          toast.info(" No speech detected — recording stopped.");
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
          stopRecording(false); // Proceed to transcribe on max speech
          toast.success(" Recording stopped after 10s of continuous speech.");
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
        shouldTranscribeRef.current = true; // Reset flag
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          cancelAnimationFrame(rafRef.current);
          if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
          }
          // Clean up stream tracks
          if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
          }
          // 1. Auto stop (no/long silence)
          if (autoStoppedRef.current) {
            setIsRecording(false);
            mediaRecorderRef.current = null;
            return;
          }
          // 2. Manual stop but not enough speech OR cancelled
          if (!shouldTranscribeRef.current) {
            if (!shouldTranscribeRef.current) {
              toast.info(" Recording cancelled.");
            } else {
              toast.info(" No clear speech detected — recording stopped.");
            }
            setIsRecording(false);
            mediaRecorderRef.current = null;
            return;
          }
          // 3. We have enough speech energy, send to backend
          const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.webm");

          setIsTranscribing(true); // ✅ Start loader
          onTranscribingStart && onTranscribingStart();

          try {
            toast.info(" Transcribing your voice...");
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
            setIsTranscribing(false); // ✅ Stop loader
            onTranscribingEnd && onTranscribingEnd();
            setIsRecording(false);
            mediaRecorderRef.current = null;
          }
        };

        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);              // ✅ triggers onRecordingStart
        toast.success(" Recording started. Speak now!");

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

    const stopRecording = (cancel = false) => {
      shouldTranscribeRef.current = !cancel; // Set flag based on cancel
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

    // ✅ New handlers for the two buttons
    const handleCancel = () => {
      stopRecording(true); // Cancel flag
    };

    const handleConfirm = () => {
      stopRecording(false); // Proceed to transcribe
    };

    const isComponentDisabled = disabled || isTranscribing;

    useImperativeHandle(ref, () => ({
      stopRecording: (cancel = false) => stopRecording(cancel), // Expose with cancel param if needed
      analyserRef,
    }));

    if (isTranscribing) {
      return (
        <div className={`mic-button ${isComponentDisabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}>
          <div className="pulse-container">
            <FiLoader size={20} className="text-blue-500 animate-spin" />
          </div>
        </div>
      );
    }

    if (isRecording) {
      return (
        <div className="mic-controls-container"> {/* ✅ New container for two buttons */}
          <button
            className="mic-action-btn cancel-btn"
            onClick={handleCancel}
            disabled={isComponentDisabled}
            aria-label="Cancel recording"
          >
            <FiX size={20} className="text-red-500" />
          </button>
          <button
            className="mic-action-btn confirm-btn"
            onClick={handleConfirm}
            disabled={isComponentDisabled}
            aria-label="Confirm and transcribe"
          >
            <FiCheck size={20} className="text-green-500" />
          </button>
        </div>
      );
    }

    return (
      <div
        className={`mic-button ${disabled ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
        onClick={!disabled ? startRecording : undefined}
        aria-label="Start recording"
      >
        <FaMicrophone size={20} className="text-green-500" />
      </div>
    );
  }
);

export default VoiceRecorder;