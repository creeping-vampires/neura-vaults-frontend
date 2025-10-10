import React from "react";
import { Address } from "viem";
import { useHLName } from "@/hooks/useHLName";
import { formatAddress } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, Wallet } from "lucide-react";

interface AddressDisplayProps {
  address: Address | undefined | null;
  className?: string;
  variant?: "default" | "prominent";
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  className,
  variant = "default",
}) => {
  const { hlName, isLoading } = useHLName(address);

  if (!address) {
    return null;
  }

  if (isLoading) {
    return <Skeleton className={`h-5 w-32 rounded-md ${className}`} />;
  }

  const FallbackDisplay = () => (
    <div className="flex items-center space-x-2">
      <Wallet className="h-4 w-4" />
      <span className={className} title={address}>
        {formatAddress(address)}
      </span>
    </div>
  );

  const generateAvatar = (name: string) => {
    const colors = [
      "from-teal-500 to-teal-600",
      "from-emerald-500 to-teal-600",
      "from-cyan-500 to-teal-600",
      "from-teal-600 to-emerald-600",
      "from-green-500 to-teal-600",
      "from-teal-500 to-green-600",
    ];

    const hash = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colorIndex = hash % colors.length;

    return colors[colorIndex];
  };

  const isProminent = variant === "prominent";
  const avatarGradient = hlName
    ? generateAvatar(hlName)
    : "from-teal-400 to-cyan-500";

  return (
    <>
      {hlName ? (
        <div className="flex items-center gap-2 px-2 py-3 rounded-2xl bg-transparent  transition-all duration-200">
          <div
            className={`rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center ${
              isProminent ? "w-7 h-7" : "w-6 h-6"
            }`}
          >
            <span
              className={`font-bold text-white ${
                isProminent ? "text-base" : "text-sm"
              }`}
            >
              {hlName?.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* HL Name Text */}
          <span
            className={`font-semibold text-white ${
              isProminent ? "text-lg" : "text-base"
            } ${className}`}
          >
            {hlName}
          </span>

          {/* Dropdown indicator */}
          <ChevronDown
            className={`text-muted-foreground transition-colors duration-200 ${
              isProminent ? "w-5 h-5" : "w-4 h-4"
            }`}
          />
        </div>
      ) : (
        <FallbackDisplay />
      )}
    </>
  );
};
