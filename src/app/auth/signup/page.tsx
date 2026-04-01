import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
  title: 'Create Account | MathQuest',
  description: 'Create your MathQuest account and start learning math',
};

export default function SignupPage() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <SignupForm />
    </div>
  );
}
