import { authContent } from "@/data/auth";
import { SignUpForm } from "./signup-form";

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-display)]">
          {authContent.signup.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {authContent.signup.description}
        </p>
      </div>
      <SignUpForm />
    </div>
  );
}
