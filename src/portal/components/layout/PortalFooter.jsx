import { Link } from "react-router";
export default function PortalFooter({ returnTo }) {
  return (
    <footer>
      <span>Koneru Lakshmaiah Education Foundation</span>
      <Link to="/KLEF/8-2/Developer/G-Bhaanu-Sai.php" state={{ from: returnTo || "/KLEF/8-2/GBS.php" }}>
        Designed &amp; Developed by GBS
      </Link>
      <span>Academic Registration Portal · CSE-2</span>
    </footer>
  );
}
