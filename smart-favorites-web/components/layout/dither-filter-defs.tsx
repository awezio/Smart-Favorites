/** Bayer 4×4 ordered-dither overlay (Low-tech Magazine style). */
export function DitherFilterDefs() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter
          id="sf-dither"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feColorMatrix
            type="matrix"
            values="0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0.2126 0.7152 0.0722 0 0
                    0 0 0 1 0"
            result="gray"
          />
          <feComponentTransfer in="gray" result="contrast">
            <feFuncR type="linear" slope="1.12" intercept="-0.06" />
            <feFuncG type="linear" slope="1.12" intercept="-0.06" />
            <feFuncB type="linear" slope="1.12" intercept="-0.06" />
          </feComponentTransfer>
          <feComponentTransfer in="contrast">
            <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />
            <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
