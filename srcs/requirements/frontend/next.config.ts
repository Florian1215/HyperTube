import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const serverName = process.env.SERVER_NAME?.replace(/^\w+:\/\//, "").replace(/[:/].*$/, "");

const nextConfig: NextConfig = {
    allowedDevOrigins: ["192.168.1.30", ...(serverName ? [serverName] : [])],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "image.tmdb.org",
                pathname: "/t/p/**",
            },
            {
                protocol: "https",
                hostname: "cdn.intra.42.fr"
            },
            {
                protocol: "https",
                hostname: "avatars.githubusercontent.com"
            },
            {
                protocol: "https",
                hostname: "gitlab.com",
                pathname: "/uploads/**",
            }
        ],
    },
    // The URLs used to start with the locale
    async redirects() {
        return [
            {source: "/:locale(en|fr|de)", destination: "/", permanent: false},
            {source: "/:locale(en|fr|de)/:path*", destination: "/:path*", permanent: false},
        ];
    },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
