interface AuthLoadingScreenProps {
  message?: string;
}

export function AuthLoadingScreen({ message = "Loading..." }: AuthLoadingScreenProps) {
  return (
    <div
      className="min-h-screen bg-background"
      aria-busy="true"
      aria-label={message}
    />
  );
}
