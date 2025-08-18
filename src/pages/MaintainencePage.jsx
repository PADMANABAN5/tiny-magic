import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Wrench, Clock } from "lucide-react";

const MaintenancePage = () => {
  useEffect(() => {
    // Function to handle the keydown event
    const handleKeyDown = (e) => {
      // Check for common DevTools shortcuts
      if (
        (e.key === "F12") ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i")) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && (e.key === "J" || e.key === "j")) || // Ctrl+Shift+J
        (e.ctrlKey && e.key === "U") // Ctrl+U to view source
      ) {
        e.preventDefault();
      }
    };

    // Function to handle the contextmenu (right-click) event
    const handleContextMenu = (e) => {
      e.preventDefault();
    };

    // Add event listeners when the component mounts
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", handleContextMenu);

    // Clean up event listeners when the component unmounts
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []); 
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white text-center p-6 font-sans" style={{ overflow: "hidden", marginTop:"100px" }}>
      {/* Animated Icon */}
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        className="mb-6"
      >
        <Wrench size={80} className="text-yellow-400 drop-shadow-lg" style={{color:"black"}} />
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, delay: 0.2 }}
        className="text-4xl md:text-6xl font-extrabold mb-4 drop-shadow-xl"
        style={{ color: "black" }}
      >
        🚧 Under Maintenance 🚧
      </motion.h1>

      {/* Description */}
      <motion.p
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, delay: 0.4 }}
        className="text-lg md:text-xl text-gray-300 max-w-2xl mb-6 leading-relaxed"
        style={{ color: "black" }}
      >
        We’re making some improvements to bring you a better experience.
        Thank you for your patience!
      </motion.p>

      {/* ETA */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, delay: 0.6 }}
        className="flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm px-5 py-2 rounded-full shadow-2xl border border-gray-700"
      >
        <Clock className="text-blue-400"  style={{ color: "black" }}/>
        <span className="text-sm md:text-base font-medium text-gray-100" style={{ color: "black" ,marginLeft:"5px"}}>Expected back soon</span>
      </motion.div>
    </div>
  );
};

export default MaintenancePage;