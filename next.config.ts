import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [{ source: "/resume.pdf", destination: "/Ekansh_Verma_Resume.pdf", permanent: true }];
  },
};

export default nextConfig;
