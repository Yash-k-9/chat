// All the app's pages (routes) in one place.
import { Navigate, Route, Routes } from 'react-router';
import { GuestRoute, ProtectedRoute } from './auth/RouteGuards.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ChatsPage from './pages/ChatsPage.jsx';
import JoinPage from './pages/JoinPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';

export default function App() {
  return (
    <Routes>
      {/* Only for logged-out users */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Reset links from emails: work whether or not you're logged in */}
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Only for logged-in users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/chats" element={<ChatsPage />} />
        <Route path="/chats/:chatId" element={<ChatsPage />} />
      </Route>

      {/* Invite links: works for guests AND logged-in users, so no guard */}
      <Route path="/join" element={<JoinPage />} />

      {/* Anything else → chats (which redirects to login if needed) */}
      <Route path="*" element={<Navigate to="/chats" replace />} />
    </Routes>
  );
}
