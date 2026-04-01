import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Sign In | MathQuest',
  description: 'Sign in to your MathQuest account',
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <LoginForm />
    </div>
  );
}
