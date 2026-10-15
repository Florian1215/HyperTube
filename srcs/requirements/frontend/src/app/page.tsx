"use client";

import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {HypertubeLogo} from "@/components/Icons";
import {useLocale, useTranslations} from "next-intl";
import Colors from "@/components/Colors";
import useAuth from "@/contexts/AuthContext";
import useResponsiveSize from "@/hooks/useResponsiveSize";
import {SEARCH_CONTINUE, SEARCH_DIRECTSTREAM, SEARCH_FRIENDS, SEARCH_UPCOMING, useItems} from "@/services/medias.service";
import formatReleaseDate from "@/utils/formatReleaseDate";
import GenreTags from "@/components/GenreTags";
import {FriendActivityCard, groupActivities} from "@/components/FriendsActivity";
import MediasGrid from "@/components/MediasGrid";
import useModal from "@/contexts/ModalContext";
import shuffleArray from "@/utils/shuffleArray";
import {useComingSoon, useContinueWatching, useFollowingActivity} from "@/services/users.service";
import {iMedia, iMediaDetails} from "@/types/media";
import {Link} from "@/i18n/navigation";
import MediaHero from "@/components/MediaHero";
import formatURL from "@/utils/formatURL";
import {TitleMedia} from "@/components/Title";
import PageMeta from "@/components/PageMeta";

export default function HomePage() {
    const {user} = useAuth();
    const t = useTranslations("home");
    const tMeta = useTranslations("meta");
    const size = useResponsiveSize();
    const genreCount = {xs: 3, md: 4, lg: 6, xl: 8}[size];
    const heightAnimationLogo = {xs: 100, md: 200, lg: 250, xl: 300}[size];

    const {data: continueWatchingData} = useContinueWatching(user?.id);
    const {data: comingSoon} = useComingSoon(user?.id);
    const locale = useLocale();
    const {data: movies} = useItems("movies");
    const {data: series} = useItems("series");
    const shuffledPopular = useMemo(() => {
        const featured = [
            ...filterAlreadyWatch(movies?.results),
            ...filterAlreadyWatch(series?.results),
        ];
        return shuffleArray(featured);
    }, [movies?.results, series?.results]);

    const {data: featuredMovies} = useItems("movies", "featured");
    const {data: featuredSeries} = useItems("series", "featured");
    const sortedFeatured = useMemo(() => {
        const featured = [
            ...filterAlreadyWatch(featuredMovies?.results),
            ...filterAlreadyWatch(featuredSeries?.results),
        ] as iMediaDetails[];
        return featured.sort((a, b) => (b.feature_at ?? "").localeCompare(a.feature_at ?? ""));
    }, [featuredMovies?.results, featuredSeries?.results]);

    const {data: mostRatedMovies} = useItems("movies", "top-rated");
    const mostRated = filterAlreadyWatch(mostRatedMovies?.results);
    const shuffledMostRated = useMemo(() => shuffleArray(mostRated), [mostRated])

    const continueWatching = continueWatchingData?.results ?? [];

    const {data: dirctedWatchMovies} = useItems("movies", SEARCH_DIRECTSTREAM);
    const filterDirectedWatchMovies = filterAlreadyWatch(dirctedWatchMovies?.results);

    const groupSeries = user?.group_series ?? true;
    const {data: friendAct} = useFollowingActivity(user?.id, groupSeries);
    const activities = (friendAct?.results ?? []).filter((activity) => activity.backdrop_url);

    return (<div>
        <PageMeta title={tMeta("home")} description={tMeta("homeDescription")}/>
        <AnimateLogo maxHeight={heightAnimationLogo} />
        <SliderHero medias={sortedFeatured.slice(0, 5)}/>
        <GenreTags genreCount={genreCount} className="justify-center w-full my-6 md:my-8"/>

        <div className="flex flex-col gap-4 px-4 sm:gap-8 sm:px-6" >
            {activities.length > 0 && <Section title={t("friendsActivity")} href={`/search?type=${activities[0].type}&q=${encodeURIComponent(SEARCH_FRIENDS)}`}>
                <div className="flex gap-x-2 sm:gap-x-4 overflow-x-auto">
                    {groupActivities(activities).map((group) => <FriendActivityCard key={`${group[0].type}-${group[0].id}`} activities={group}/>)}
                </div>
            </Section>}
            {(continueWatching.length > 0) &&
            <Section title={t("continueWatching")} href={`/search?type=${continueWatching[0].type}&q=${encodeURIComponent(SEARCH_CONTINUE)}`}>
                <MediasGrid mediaSets={continueWatching} setLimit={true} showEpisode={true}/>
            </Section>}

            {
                (sortedFeatured === undefined || sortedFeatured.length > 0) &&
                <Section title={t("featured")} href="/search?type=movies&q=featured">
                    <MediasGrid mediaSets={sortedFeatured.slice(5, 10) ?? undefined} setLimit={true}/>
                </Section>
            }

            {
                (shuffledPopular === undefined || shuffledPopular.length > 0) &&
                <Section title={t("popular")} href={`/search?type=${shuffledPopular[0].type}&q=popular`}>
                    <MediasGrid mediaSets={shuffledPopular} setLimit={true}/>
                </Section>
            }

            <Section title={t("mostRated")} href="/search?type=movies&q=top-rated">
                <MediasGrid mediaSets={shuffledMostRated.length > 0 ? shuffledMostRated : undefined} setLimit={true}/>
            </Section>

            {comingSoon && comingSoon.results.length > 0 &&
                <Section title={t("comingSoon")} href={`/search?type=${comingSoon.results[0].type}&q=${encodeURIComponent(SEARCH_UPCOMING)}`}>
                    <MediasGrid mediaSets={comingSoon.results} setLimit={true} showEpisode={true} showProgress={false} getLabel={(media) => formatReleaseDate(media, locale)}/>
                </Section>}

            {filterDirectedWatchMovies.length > 0 && <Section title={t("directStream")} href={`/search?type=movies&q=${SEARCH_DIRECTSTREAM}`}>
                <MediasGrid mediaSets={filterDirectedWatchMovies} setLimit={true}/>
            </Section>}
        </div>

        <Colors className="mt-4 sm:mt-6" />
    </div>);
}

function Section({children, title, href}: {children: React.ReactNode, title: string, href: string}) {
    return (<section className="flex flex-col">
        <Link className="uppercase font-wide text-lg sm:text-xl font-bold hover:text-accent w-fit p-2 overflow-x-hidden text-nowrap" href={href}>{`${title} >`}</Link>
        {children}
    </section>);
}

function AnimateLogo({maxHeight}: {maxHeight: number}) {
    const {activeModal, searchOpen} = useModal();
    const minHeight = maxHeight / 5;
    const [logoHeight, setLogoHeight] = useState(maxHeight);
    const [logoWidth, setLogoWidth] = useState(0);

    useEffect(() => {
        if (activeModal.type !== null || searchOpen)
            return ;
        let virtualScroll = 0;

        const handleWheel = (e: WheelEvent) => {
            const isAtMin = virtualScroll >= (maxHeight - minHeight);
            const isAtTop = window.scrollY === 0;

            if (isAtTop && (!isAtMin || e.deltaY < 0)) {
                e.preventDefault();

                virtualScroll += e.deltaY;
                virtualScroll = Math.max(0, Math.min(virtualScroll, maxHeight));
                setLogoHeight(maxHeight - virtualScroll);
            }
        };
        window.addEventListener("wheel", handleWheel, {passive: false});
        return () => {window.removeEventListener("wheel", handleWheel);};
    }, [activeModal, searchOpen, maxHeight, minHeight]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLogoHeight(maxHeight);
    }, [maxHeight]);

    useEffect(() => {
        function handleResize() {
            setLogoWidth(window.innerWidth);
        }
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (logoWidth === 0)
        return null;

    return (<div className="overflow-hidden w-full mb-4">
        <div className="flex gap-8">
            {[...Array(2)].map((_, i) => (
                <HypertubeLogo key={i} className="animate-marquee min-w-full" width={logoWidth} height={logoHeight} />
            ))}
        </div>
    </div>);
}

function SliderHero({medias}: {medias: iMedia[]}) {
    const [index, setIndex] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const startInterval = useCallback(() => {
        if (intervalRef.current)
            clearInterval(intervalRef.current);

        intervalRef.current = setInterval(() => {
            setIndex((prev) => (prev + 1) % medias.length);
        }, 6000);
    }, [medias.length]);

    const onSlide = (side: number) => {
        if (side > 0)
            setIndex((prev) => (prev + 1) % medias.length);
        else
            setIndex((prev) => (prev - 1 + medias.length) % medias.length);
        startInterval();
    };

    useEffect(() => {
        if (!medias.length)
            return;
        startInterval();
        return () => clearInterval(intervalRef.current);
    }, [medias.length, startInterval]);

    return (<div className="overflow-hidden w-full">
        <div className="flex transition-transform duration-600 ease-out"
             style={{transform: `translateX(-${100 * index}%)`}}>
            {medias.length > 0 ?
                medias.map((media, index) => (<MediaHero key={index} media={media} actionButton={
                                                                                       () => <Link href={formatURL(media)}>
                                                                                           <TitleMedia media={media} clickable={true} white={true}/>
                                                                                       </Link>}>
                    <Link href={formatURL(media)} className="size-full z-20 absolute"/>
                    <div className="h-full w-50 z-30 absolute left-0 custom-cursor-left" onClick={() => onSlide?.(-1)}/>
                    <div className="h-full w-50 z-30 absolute right-0 custom-cursor-right" onClick={() => onSlide?.(1)}/>
                </MediaHero>)) :
                <MediaHero media={undefined} />
            }
        </div>
    </div>);
}

function filterAlreadyWatch(movies?: iMedia[]) {
    if (!movies)
        return [];
    return movies.filter(m => !m.complete);
}
