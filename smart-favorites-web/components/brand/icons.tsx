import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

export function BookmarkSparkIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 4C6 3.44772 6.44772 3 7 3H17C17.5523 3 18 3.44772 18 4V20L12 17L6 20V4Z"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 8L13 11L16 11.5L13.5 13.5L14.5 16.5L12 14.5L9.5 16.5L10.5 13.5L8 11.5L11 11L12 8Z"
        className="fill-accent-creative"
      />
    </svg>
  );
}

export function SearchOrbitIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="11"
        cy="11"
        r="6"
        className="stroke-primary"
        strokeWidth="1.5"
      />
      <path
        d="M16 16L20 20"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="11" cy="11" r="9" className="stroke-primary/30" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  );
}

export function ChatBubbleIcon({ className }: IconProps) {
  return (
    <svg
      className={cn("h-6 w-6", className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V14C20 15.1046 19.1046 16 18 16H10L6 20V16H6C4.89543 16 4 15.1046 4 14V6Z"
        className="stroke-primary"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="10" r="1" className="fill-primary" />
      <circle cx="12" cy="10" r="1" className="fill-primary" />
      <circle cx="15" cy="10" r="1" className="fill-primary" />
    </svg>
  );
}
