import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
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

    async rewrites() {
    return [
        {
            source: "/api/:path*",
            destination: `http://api:${process.env.NEXT_PUBLIC_PORT}/api/:path*`,
        },
    ];
},
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
