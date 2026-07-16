import React from "react";
import { useAuth } from "../../../context/AuthContext";

const TokenTest: React.FC = () => {
  const { user, accessToken, refreshToken, isAuthenticated, loading } =
    useAuth();

  if (loading) return <p>Loading tokens...</p>;

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">🧪 Token Test</h2>
      <p>
        <strong>Authenticated:</strong> {isAuthenticated ? "✅ Yes" : "❌ No"}
      </p>
      <p>
        <strong>Access Token:</strong>{" "}
        {accessToken ? (
          <span className="text-green-600 break-all">{accessToken}</span>
        ) : (
          "Not found"
        )}
      </p>
      <p>
        <strong>Refresh Token:</strong>{" "}
        {refreshToken ? (
          <span className="text-green-600 break-all">{refreshToken}</span>
        ) : (
          "Not found"
        )}
      </p>
      <p>
        <strong>User:</strong>{" "}
        {user ? (
          <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        ) : (
          "No user data"
        )}
      </p>
    </div>
  );
};

export default TokenTest;
