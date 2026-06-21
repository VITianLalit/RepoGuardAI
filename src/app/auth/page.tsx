import AuthPanel from "@/components/auth/AuthPanel";
import Header from "@/components/layout/Header";

type AuthPageProps = {
  searchParams?: {
    mode?: string;
  };
};

export default function AuthPage({ searchParams }: AuthPageProps) {
  const initialMode = searchParams?.mode === "sign-up" ? "sign-up" : "sign-in";

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header variant="auth" />
      <AuthPanel initialMode={initialMode} />
    </div>
  );
}
