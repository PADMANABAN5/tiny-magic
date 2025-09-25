import React, { useState, useRef } from "react";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";

import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = process.env.REACT_APP_API_LINK;

function VoiceRecorder({ onTranscription, disabled=false }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
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
          toast.error("Error uploading audio. ");
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

 return (
  // Inside VoiceRecorder.jsx return()
<div
  className={`mic-button ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
>
  {isRecording ? (
    <FaMicrophoneSlash size={20}
      onClick={!disabled ? stopRecording : undefined}
      className="text-red-500"
    />
  ) : (
    <FaMicrophone size={20}
      onClick={!disabled ? startRecording : undefined}
      className="text-green-500"
    />
  )}
</div>

);
}

export default VoiceRecorder;
