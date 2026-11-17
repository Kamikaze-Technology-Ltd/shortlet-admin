import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hotel owners became hosts (hotels, property managers, home owners and car rentals).
  redirects() {
    return [{ source: "/owners", destination: "/hosts", permanent: true }];
  },
};

export default nextConfig;
