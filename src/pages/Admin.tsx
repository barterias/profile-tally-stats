import { Navigate } from "react-router-dom";

export default function Admin() {
  // Redirect to video analytics page
  return <Navigate to="/video-analytics" replace />;
}
