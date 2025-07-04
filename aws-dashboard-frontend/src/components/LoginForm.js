import React from "react";

export default function LoginForm({ onSubmit, email, setEmail, password, setPassword }) {
  return (
    <form onSubmit={onSubmit} style={{ width: "100%" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 18px" }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 500, fontSize: 16, color: "#444", paddingBottom: 4 }}>Email</td>
          </tr>
          <tr>
            <td>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  fontSize: 15,
                  marginBottom: 0,
                }}
              />
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 500, fontSize: 16, color: "#444", paddingBottom: 4 }}>Password</td>
          </tr>
          <tr>
            <td>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  fontSize: 15,
                  marginBottom: 0,
                }}
              />
            </td>
          </tr>
          <tr>
            <td style={{ textAlign: "center", paddingTop: 10 }}>
              <button
                type="submit"
                style={{
                  background: "#ff6600",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 17,
                  border: "none",
                  borderRadius: 6,
                  padding: "12px 0",
                  width: "100%",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  boxShadow: "0 2px 8px #eee",
                }}
              >
                Login
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </form>
  );
}