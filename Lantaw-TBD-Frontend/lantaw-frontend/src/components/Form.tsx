import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../api/constants";
import "../styles/Form.css";

interface FormProps {
  route: string;
  method: "login" | "register";
}

interface AuthResponse {
  access: string;
  refresh: string;
}

function Form({ route, method }: FormProps) {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const navigate = useNavigate();

  const name = method === "login" ? "Login" : "Register";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post<AuthResponse>(route, { email, password });
      if (method === "login") {
        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
        navigate("/");
      } else {
        navigate("/login");
      }
    } catch (error: unknown) {
      console.error(error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <h1>{name}</h1>

      <input
        className="form-input"
        type="text"
        placeholder="Email"
        value={email}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setEmail(e.target.value)
        }
      />

      <input
        className="form-input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setPassword(e.target.value)
        }
      />

      <button className="form-button" type="submit" disabled={loading}>
        {loading ? "Loading..." : name}
      </button>

      {error && <p className="error-text">Something went wrong.</p>}
    </form>
  );
}

export default Form;
