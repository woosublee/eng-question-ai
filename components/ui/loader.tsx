import { Loader as LucideLoader } from "lucide-react";

interface LoaderProps {
  className?: string;
}

export function Loader({ className }: LoaderProps) {
  return (
    <LucideLoader className={className} />
  );
} 