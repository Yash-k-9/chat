// Route guards decide who may see a page.
// They render <Outlet /> (the matched child route) or redirect elsewhere.
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import { SocketProvider } from '../realtime/SocketContext.jsx';
import { E2EEProvider } from '../crypto/E2EEContext.jsx';
import KeyGate from '../crypto/KeyGate.jsx';

function FullScreenLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

// Only for logged-in users. Guests go to /login, remembering where they wanted to go.
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'guest') return <Navigate to="/login" replace state={{ from: location }} />;
  // Logged in → open the real-time connection, load my encryption keys,
  // and only show the app once the keys are ready.
  return (
    <SocketProvider>
      <E2EEProvider>
        <KeyGate>
          <Outlet />
        </KeyGate>
      </E2EEProvider>
    </SocketProvider>
  );
}

// Only for guests (login/register). Logged-in users go straight to their chats.
export function GuestRoute() {
  const { status } = useAuth();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'authenticated') return <Navigate to="/chats" replace />;
  return <Outlet />;
}
