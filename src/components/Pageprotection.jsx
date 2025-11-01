import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const PageProtection = () => {
  const [isActive, setIsActive] = useState(false); 

  useEffect(() => {
    if (!isActive) return; 

    const handleContextMenu = (e) => {
      e.preventDefault();
      toast.error("Right-click is disabled.");
    };

    const handleCopyCutPaste = (e) => {
      e.preventDefault();
      toast.error("Copying, cutting, and pasting are disabled.");
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey && ["c", "v", "x", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast.error("Keyboard shortcuts for copy,paste/select are disabled.");
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyCutPaste);
    document.addEventListener("cut", handleCopyCutPaste);
    document.addEventListener("paste", handleCopyCutPaste);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyCutPaste);
      document.removeEventListener("cut", handleCopyCutPaste);
      document.removeEventListener("paste", handleCopyCutPaste);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActive]);
  return null; 
};

export default PageProtection;
