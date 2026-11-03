import { authContent } from "@/data/auth";
import { SignInForm } from "./signin-form";

export default function SignInPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          {authContent.signin.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {authContent.signin.description}
        </p>
      </div>
      <SignInForm />
    </div>
  );
}
