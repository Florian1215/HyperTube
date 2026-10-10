import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
    allowedDevOrigins: ['192.168.1.30'],
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
    async rewrites() {
    return [
        {
            source: "/api/:path*",
            destination: `http://api:8794/api/:path*`,
        },
    ];
},
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
