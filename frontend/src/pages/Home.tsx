import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function Home() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="max-w-3xl mx-auto text-center py-10">
      <h2 className="text-4xl font-extrabold tracking-tight mb-4">Welcome to Summit AI</h2>
      <p className="text-muted-foreground mb-8">
        Capture meetings, manage recordings, and collaborate securely. Public home is accessible to everyone.
      </p>

      {user ? (
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="px-5 py-2.5 rounded-lg bg-muted text-foreground font-medium hover:bg-muted/70 transition"
          >
            Create account
          </Link>
        </div>
      )}
    </div>
  );
}

export default Home;
