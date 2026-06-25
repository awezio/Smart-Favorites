import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const sizeMap = {
  sm: { icon: 28, text: "text-base" },
  md: { icon: 36, text: "text-lg" },
  lg: { icon: 48, text: "text-2xl" },
};

export function Logo({ className, size = "md", showText = true }: LogoProps) {
  const { icon, text } = sizeMap[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="shrink-0"
      >
        <rect width="48" height="48" rx="12" fill="url(#sf-logo-grad)" />
        <path
          d="M14 18C14 15.7909 15.7909 14 18 14H30C32.2091 14 34 15.7909 34 18V30C34 32.2091 32.2091 34 30 34H18C15.7909 34 14 32.2091 14 30V18Z"
          fill="white"
          fillOpacity="0.15"
        />
        <path
          d="M20 22L24 26L32 18"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="28" r="2" fill="white" fillOpacity="0.9" />
        <defs>
          <linearGradient
            id="sf-logo-grad"
            x1="4"
            y1="4"
            x2="44"
            y2="44"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="hsl(262, 83%, 58%)" />
            <stop offset="1" stopColor="hsl(280, 70%, 45%)" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span className={cn("font-serif font-semibold tracking-tight", text)}>
          Smart Favorites
        </span>
      )}
    </span>
  );
}
