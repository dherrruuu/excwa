import { useNavigate } from "react-router-dom";
import DeveloperApplicationForm from "../../components/client/DeveloperApplicationForm";

export default function DevRegister() {
  const navigate = useNavigate();

  return (
    <DeveloperApplicationForm
      onClose={() => navigate("/")}
    />
  );
}