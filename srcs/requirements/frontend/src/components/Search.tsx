"use client";

import {iGenre} from "@/types/genre";
import React, {useEffect, useRef, useState} from "react";
import {GridIcon, ListIcon} from "@/components/Icons";
import {useLocale, useTranslations} from "next-intl";
import useGenres from "@/hooks/useGenres";
import {tLocale} from "@/i18n/routing";
import {useItems} from "@/services/medias.service";
import CloseButton from "@/components/ui/Button/CloseButton";
import MediasGrid from "@/components/MediasGrid";
import SmallText from "@/components/ui/SmallText";
import IconButton from "@/components/ui/Button/IconButton";
import {usePathname, useRouter} from "@/i18n/navigation";
import {useSearchParams} from "next/navigation";
import MediasList from "@/app/search/MediasList";
import {iSort, SEARCH_TYPES, tSearch, tSort, tT} from "@/types/utils";
import {iMedia, iPeople} from "@/types/media";
import RadioButton from "@/components/ui/Button/RadioButton";
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import {useUsersSearch} from "@/services/users.service";
import {usePeopleSearch} from "@/services/people.service";
import PeopleCard from "@/components/PeopleCard";
import Pagination from "@/components/ui/Pagination";
import computeTotalPage from "@/utils/computeTotalPage";
import {iUser} from "@/types/user";
import ProfilePicture from "@/components/ProfilePicture";
import FollowButton from "@/components/FollowButton";
import useAuth from "@/contexts/AuthContext";
import useModal from "@/contexts/ModalContext";
import {Link} from "@/i18n/navigation";

type tViewType = | "grid" | "list";

const NO_PARAMS = new URLSearchParams();

export default function Search({modal = false}: {modal?: boolean}) {
    const urlParams = useSearchParams();
    const searchParams = modal ? NO_PARAMS : urlParams;
    const router = useRouter();
    const pathname = usePathname();
    const genreId = searchParams.get("genre") as number | null;
    let genre: undefined | iGenre;
    const locale = useLocale() as tLocale;
    const {data} = useGenres(locale);
    if (genreId && data)
        genre = data.genres.find(e => e.id == genreId);
    const mostRated = searchParams.get("sort");
    const query = searchParams.get("q");
    const type = searchParams.get("type");
    const [searchValue, setSearchValue] = useState(query ?? "");
    const [viewType, setViewType] = useState<tViewType>("grid");
    const [sort, setSort] = useState<iSort>({type: mostRated ? "grade" : undefined, side: true});
    const [typeSearch, setTypeSearch] = useState<tSearch>(type as tSearch ?? "movies");
    const {user: authUser} = useAuth();
    const {closeSearch} = useModal();
    const isUsersSearch = typeSearch === "users";
    const isPeopleSearch = typeSearch === "people";
    const [page, setPage] = useState(1);
    const hasResults = !modal || searchValue.trim().length > 0;
    const {data: medias, isError} = useItems(typeSearch, searchValue.trim(), page, hasResults && !isUsersSearch && !isPeopleSearch);
    const {data: people, isError: isPeopleError} = usePeopleSearch(searchValue.trim(), hasResults && isPeopleSearch, page);
    const {data: users, isError: isUsersError} = useUsersSearch(searchValue.trim(), hasResults && isUsersSearch, authUser?.id, page);
    const found = isUsersSearch ? users : isPeopleSearch ? people : medias;
    const t = useTranslations("search");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
    }, []);

    useEffect(() => {
        const savedViewType = localStorage.getItem("searchViewType") as tViewType;
        const savedSearchType = localStorage.getItem("searchType") as tSearch;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setViewType((genre === undefined && mostRated === null ? (savedViewType ?? "grid") : "list"));
        setTypeSearch(type as tSearch ?? savedSearchType ?? "movies");
    }, [genre, mostRated, type]);

    useEffect(() => {
        if (modal)
            return;
        const q = searchValue.trim();
        const params = new URLSearchParams(searchParams.toString());
        if (q)
            params.set("q", q);
        else
            params.delete("q");
        router.push(`${pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [medias, users, people]);

    const handleSearchChange = (e?: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e?.target.value.toLowerCase() ?? "";
        setSearchValue(newValue);
        setPage(1);
    }
    const handleChangeSearchType = (value: tSearch) => {
        localStorage.setItem("searchType", value);
        setTypeSearch(value);
        setPage(1);
        if (type && !modal) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("type", value);
            router.replace(`${pathname}?${params.toString()}`);
        }
    };
    const handleSetViewType = (value: tViewType) => {
        localStorage.setItem("searchViewType", value);
        setViewType(value);
    };
    const changeSort = (type: tSort, side: boolean) => setSort({type, side});

    const searchBar = (<>
        {/* ---------- SEARCH BAR ---------- */}
        <div className="relative flex items-center px-6">
            <input id="search-bar" ref={inputRef} type="search" placeholder={t(typeSearch + "SearchPlaceholder")} value={searchValue} onChange={handleSearchChange} className="z-10 w-full text-5xl md:text-7xl xl:text-8xl 2xl:text-9xl font-condensed uppercase border-b focus:border-b-2" />
            <CloseButton className="absolute right-8 z-20" disabled={!modal && searchValue.length === 0} onClickAction={() => {
                handleSearchChange();
                if (modal)
                    closeSearch();
            }}/>
        </div>
    </>);
    const results = (<>
        {/* ---------- Filter ---------- */}
        <div className="flex justify-between px-6 gap-4">
            <div className="min-w-0">
                <HorizontalScroll className="gap-2 sm:gap-4">
                    {SEARCH_TYPES.map((type) => <RadioButton key={type} selected={typeSearch === type} onClick={() => handleChangeSearchType(type)}>{t(type)}</RadioButton>)}
                </HorizontalScroll>
            </div>
            {
                hasResults && (typeSearch === "movies" || typeSearch === "series") &&
                <div className="flex shrink-0 gap-4">
                    <IconButton color={viewType == "grid" ? "dblack" : "gray"} onClick={() => handleSetViewType("grid")}>{(color: string) => <GridIcon color={color}/>}</IconButton>
                    <IconButton color={viewType == "list" ? "dblack" : "gray"} onClick={() => handleSetViewType("list")}>{(color: string) => <ListIcon color={color}/>}</IconButton>
                </div>
            }
        </div>

        {hasResults && <Pagination currentIndex={page} onClick={setPage} totalPage={computeTotalPage(found)} variableMT={true}>
            {isUsersSearch ?
                <UsersResults t={t} users={isUsersError ? [] : users?.results}/> :
                isPeopleSearch ?
                <PeopleResults t={t} people={isPeopleError ? [] : people?.results}/> :
                <Results t={t} medias={isError ? [] : medias?.results} viewType={viewType} sort={sort} changeSort={changeSort} genre={genre}/>
            }
        </Pagination>}
    </>);

    if (modal)
        return (<>
            <div className="bg-white border-b px-2 md:px-4 xl:px-6 pb-4 md:pb-6">
                {searchBar}
            </div>
            <div data-search-background="" className="dark-mode flex flex-col gap-2 md:gap-4 px-2 md:px-4 xl:px-6 py-4 md:py-6">
                {results}
            </div>
        </>);

    return (<div className="flex flex-col gap-2 md:gap-4 mx-2 md:mx-4 xl:mx-6 pb-2 md:pb-4 xl:pb-6">
        {searchBar}
        {results}
    </div>);
}

function UsersResults({t, users}: {t: tT, users?: iUser[]}) {
    if (users && users.length === 0)
        return (<SmallText>{t("noUsers")}</SmallText>);

    return (<div className="divide-gray divide-y gap-2 sm:gap-4 px-6">
        {users?.map((user) => (
            <div key={user.id} className="flex items-center p-3 group">
                <Link href={`/users/${user.id}`} className="flex flex-1 items-center gap-4">
                    <ProfilePicture user={user}/>
                    <span className="text-bold truncate text-dblack group-hover:underline">{user.username}</span>
                </Link>
                <FollowButton user={user}/>
            </div>
        ))}
    </div>);
}

function PeopleResults({t, people}: {t: tT, people?: iPeople[]}) {
    if (people && people.length === 0)
        return (<SmallText>{t("noPeople")}</SmallText>);

    return (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-2 sm:gap-x-4 px-6">
        {people?.map((p) => <PeopleCard key={p.id} people={p}/>)}
    </div>);
}

function Results({t, medias, viewType, sort, changeSort, genre}: {t: tT, medias?: iMedia[], viewType: tViewType, sort: iSort, changeSort: (type: tSort, side: boolean) => void, genre: undefined | iGenre}) {
    if (medias && medias.length === 0)
        return (<SmallText>{t("noResults")}</SmallText>);

    const today = new Date();
    if (medias)
        medias = medias.filter(m => m.poster_url.length > 0 && m.backdrop_url.length > 0 && (m.vote_count > 50 || !m.release_date || new Date(m.release_date) > today));

    if (medias && medias.length === 0)
        return (<SmallText>{t("emptyPage")}</SmallText>);

    if (viewType === "grid")
        return (<MediasGrid mediaSets={medias}/>);
    return (<MediasList mediaSets={medias} sort={sort} changeSort={changeSort} genre={genre}/>);
}
