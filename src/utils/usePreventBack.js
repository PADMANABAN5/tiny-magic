import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Prevents leaving the role page with the back button.
 */
export default function usePreventBack(path) {
  const navigate = useNavigate();

  useEffect(() => {
    // Push a dummy state so back button triggers popstate
    window.history.pushState(null, "", window.location.href);

    const handlePopState = () => {
      // Immediately push state back & force stay on same page
      window.history.pushState(null, "", window.location.href);
      navigate(path, { replace: true });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, path]);
}
