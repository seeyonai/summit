import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Alert, AlertTitle } from '@/components/ui/alert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '../../components/ui/button';

function CustomSignOn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Prevents double execution during React strict mode
  const signOnAttempted = useRef(false);
  const { customSignOn } = useAuth();

  useEffect(() => {
    async function signOn() {
      // Ensure signOn is only executed once
      if (signOnAttempted.current) return;
      signOnAttempted.current = true;

      // Parse query parameters
      const searchParams = Object.fromEntries(new URLSearchParams(location.search));

      try {
        await customSignOn(searchParams);

        // User and token are automatically set by the auth context
        console.info('🏠 Now redirecting to home page');
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to connect to authentication service:', error);
        if (error instanceof Error) {
          setError(`Authentication failed: ${error.message}`);
        } else {
          setError('Failed to connect to authentication service');
        }
      } finally {
        setIsLoading(false);
      }
    }

    signOn();
  }, [location.search, navigate, customSignOn]);

  return (
    <div className="flex items-center justify-center bg-background">
      <div className="text-center w-full max-w-md p-6">
        {isLoading ? (
          <>
            <LoadingSpinner className="mb-4 mx-auto" />
            <h1 className="text-2xl font-semibold mb-2">Processing Sign On</h1>
            <p className="text-muted-foreground">
              Please wait while we verify your credentials...
            </p>
          </>
        ) : error ? (
          <>
            <h1 className="text-2xl font-semibold mb-4">Authentication Error</h1>
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              {error}
            </Alert>
            <Button
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default CustomSignOn;