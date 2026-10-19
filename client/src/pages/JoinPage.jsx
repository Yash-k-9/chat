// /join?code=XYZ — where invite links land.
//   Not logged in → go to signup with the code filled in (new person).
//   Logged in     → show "Accept invite" (existing member), then open the new chat.
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext.jsx';
import AuthLayout from '../components/AuthLayout.jsx';
import JoinPanel from '../components/JoinPanel.jsx';
import Spinner from '../components/Spinner.jsx';

export default function JoinPage() {
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code') || '';

  if (status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (status === 'guest') {
    return <Navigate to={`/register?invite=${encodeURIComponent(code)}`} replace />;
  }

  return (
    <AuthLayout
      emoji="💌"
      title="You've got an invite!"
      subtitle={`Logged in as @${user.username}`}
      footer={
        <button onClick={() => navigate('/chats')} className="font-bold text-fuchsia-300 hover:underline">
          ← Back to my chats
        </button>
      }
    >
      <JoinPanel initialCode={code} onChatOpened={(chat) => navigate(`/chats/${chat.id}`, { replace: true })} />
    </AuthLayout>
  );
}
