import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ComponentProps, PropsWithChildren } from "react";
import App from "@/App";

// Mock framer-motion to render children directly
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: ComponentProps<"div">) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: ComponentProps<"h1">) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: ComponentProps<"p">) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: PropsWithChildren) => <>{children}</>,
}));

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders splash screen on mount", () => {
    vi.useFakeTimers();
    render(<App />);
    expect(screen.getByText("WEAVE")).toBeInTheDocument();
    expect(screen.getByText("Neural Design Studio")).toBeInTheDocument();
  });
});
