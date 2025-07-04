import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import { login } from '../logging_api/auth';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("isLoggedIn")) {
      navigate("/monitoring", { replace: true });
    }
  }, [navigate]);

  if (localStorage.getItem("isLoggedIn")) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await login(email, password);
      if (res.message === "Login successful") {
        localStorage.setItem("isLoggedIn", "true");
        onLogin(res);
        navigate("/monitoring", { replace: true });
      } else {
        alert(res.error || "Login failed");
      }
    } catch (err) {
      alert("Network error: " + err.message);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#ff6600",
          padding: "28px 48px",
          marginBottom: 60,
          borderRadius: "0 0 18px 18px",
          boxShadow: "0 2px 12px #eee",
        }}
      >
        <img
          src="/rapyder.png"
          alt="Logo"
          style={{ height: 60 }}
        />
        <h1
          style={{
            fontSize: 34,
            fontWeight: 700,
            color: "#fff",
            margin: 0,
            letterSpacing: 1,
            fontFamily: "Segoe UI, Arial, sans-serif",
          }}
        >
          Welcome to Rapyder Service Desk
        </h1>
      </div>

      {/* Login Card */}
      <div
        style={{
          maxWidth: 420,
          margin: "0 auto",
          padding: "40px 36px 32px 36px",
          borderRadius: 18,
          boxShadow: "0 4px 32px #e0e0e0",
          background: "#fff",
          fontFamily: "Segoe UI, Arial, sans-serif",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: 26,
            fontWeight: 600,
            marginBottom: 18,
            color: "#ff6600",
            letterSpacing: 0.5,
          }}
        >
          Login
        </h2>
        <p style={{
          textAlign: "center",
          color: "#888",
          marginBottom: 28,
          fontSize: 15,
        }}>
          Please enter your credentials to continue
        </p>
        <LoginForm
          onSubmit={handleSubmit}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
        />
      </div>
    </div>
  );
}