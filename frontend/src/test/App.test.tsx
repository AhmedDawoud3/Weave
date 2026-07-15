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

// Mock lazy-loaded pages so they resolve synchronously and avoid Suspense page loading fallback
vi.mock("../pages/LandingPage", () => ({
  LandingPage: () => (
    <div>
      <h1>WEAVE</h1>
      <p>Neural Design Studio</p>
    </div>
  )
}));
vi.mock("../pages/LoginPage", () => ({ LoginPage: () => null }));
vi.mock("../pages/DashboardPage", () => ({ DashboardPage: () => null }));
vi.mock("../pages/StudioPage", () => ({ StudioPage: () => null }));
vi.mock("../pages/PrivacyPage", () => ({ PrivacyPage: () => null }));
vi.mock("../pages/FeaturesPage", () => ({ FeaturesPage: () => null }));
vi.mock("../pages/PricingPage", () => ({ PricingPage: () => null }));
vi.mock("../pages/GalleryPage", () => ({ GalleryPage: () => null }));

describe("App", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders splash screen on mount", async () => {
    render(<App />);
    expect(await screen.findByText("WEAVE")).toBeInTheDocument();
    expect(await screen.findByText("Neural Design Studio")).toBeInTheDocument();
  });
});
