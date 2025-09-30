import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function NotFound() {
  const { user } = useAuth();
  return (
    <div className="max-w-xl mx-auto text-center py-16">
      <h2 className="text-3xl font-bold mb-2">Page not found</h2>
      <p className="text-muted-foreground mb-8">The page you are looking for does not exist.</p>
      {user ? (
        <Link to="/dashboard" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">
          Go to Dashboard
        </Link>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <Link to="/" className="px-4 py-2 rounded-lg bg-muted text-foreground hover:bg-muted/70">Home</Link>
          <Link to="/login" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Login</Link>
        </div>
      )}
    </div>
  );
}

export default NotFound;

