import { cn } from "@/lib/utils";

interface DecorationProps {
  className?: string;
}

export function BlobDecoration({ className }: DecorationProps) {
  return (
    <svg
      className={cn("pointer-events-none absolute", className)}
      viewBox="0 0 400 400"
      fill="none"
      aria-hidden
    >
      <path
        d="M200 50C280 50 350 120 350 200C350 280 280 350 200 350C120 350 50 280 50 200C50 120 120 50 200 50Z"
        fill="url(#blob-grad)"
        fillOpacity="0.4"
      />
      <defs>
        <radialGradient
          id="blob-grad"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(200 200) rotate(90) scale(200)"
        >
          <stop stopColor="hsl(262, 83%, 58%)" />
          <stop offset="1" stopColor="hsl(280, 70%, 45%)" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function GridPattern({ className }: DecorationProps) {
  return (
    <svg
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      aria-hidden
    >
      <defs>
        <pattern
          id="sf-grid"
          width="32"
          height="32"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-primary/10"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#sf-grid)" />
    </svg>
  );
}

export function StarField({ className }: DecorationProps) {
  const stars = [
    { cx: 10, cy: 15, r: 1.2 },
    { cx: 85, cy: 8, r: 0.8 },
    { cx: 45, cy: 35, r: 1 },
    { cx: 72, cy: 55, r: 1.5 },
    { cx: 25, cy: 70, r: 0.9 },
    { cx: 90, cy: 82, r: 1.1 },
    { cx: 55, cy: 90, r: 0.7 },
  ];

  return (
    <svg
      className={cn("pointer-events-none absolute", className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      {stars.map((star, i) => (
        <circle
          key={i}
          cx={star.cx}
          cy={star.cy}
          r={star.r}
          className="fill-primary/30"
        />
      ))}
    </svg>
  );
}

export function WaveDivider({ className }: DecorationProps) {
  return (
    <svg
      className={cn("w-full text-background", className)}
      viewBox="0 0 1440 48"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0 24L60 20C120 16 240 8 360 12C480 16 600 32 720 32C840 32 960 16 1080 12C1200 8 1320 16 1380 20L1440 24V48H0V24Z"
      />
    </svg>
  );
}

export function AuthIllustration({ className }: DecorationProps) {
  return (
    <svg
      className={cn("w-full max-w-md", className)}
      viewBox="0 0 400 360"
      fill="none"
      aria-hidden
    >
      <rect
        x="40"
        y="60"
        width="320"
        height="240"
        rx="16"
        className="fill-primary/10 stroke-primary/20"
        strokeWidth="2"
      />
      <rect
        x="60"
        y="90"
        width="120"
        height="80"
        rx="8"
        className="fill-primary/20"
      />
      <rect
        x="200"
        y="90"
        width="140"
        height="12"
        rx="4"
        className="fill-muted-foreground/30"
      />
      <rect
        x="200"
        y="115"
        width="100"
        height="8"
        rx="4"
        className="fill-muted-foreground/20"
      />
      <rect
        x="60"
        y="190"
        width="280"
        height="8"
        rx="4"
        className="fill-muted-foreground/15"
      />
      <rect
        x="60"
        y="210"
        width="240"
        height="8"
        rx="4"
        className="fill-muted-foreground/15"
      />
      <circle cx="200" cy="280" r="24" className="fill-primary" />
      <path
        d="M190 280L198 288L212 272"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="80" cy="40" r="20" className="fill-accent-creative/30" />
      <circle cx="340" cy="320" r="16" className="fill-primary/20" />
    </svg>
  );
}
