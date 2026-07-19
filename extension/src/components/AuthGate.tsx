// ─────────────────────────────────────────────
//  ApplyOnce AI – Authentication Gate
// ─────────────────────────────────────────────
import React, { useState, useCallback } from "react";
import { Button } from "./ui/button.tsx";
import { Input } from "./ui/input.tsx";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface AuthGateProps {
  onAuthSuccess: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
}

export const AuthGate: React.FC<AuthGateProps> = ({ login, register }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register(email, password, name || undefined);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [isRegister, email, password, name, login, register]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 text-foreground bg-background">
      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-glow mb-4">
        <Zap className="w-7 h-7 text-white" fill="white" />
      </div>
      <h2 className="text-xl font-bold mb-1">
        {isRegister ? "Create an Account" : "Welcome Back"}
      </h2>
      <p className="text-xs text-muted-foreground mb-6 text-center">
        {isRegister
          ? "Join ApplyOnce AI to easily parse resumes and autofill forms."
          : "Log in to access your secure profile."}
      </p>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        {isRegister && (
          <Input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
        )}
        <Input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={loading}
        />

        {error && (
          <p className="text-xs text-destructive font-medium text-center">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full mt-2" disabled={loading}>
          {loading ? "Please wait..." : isRegister ? "Sign Up" : "Log In"}
        </Button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError(null);
          }}
          className="text-xs text-primary hover:underline font-medium"
        >
          {isRegister ? "Already have an account? Log In" : "Need an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};
