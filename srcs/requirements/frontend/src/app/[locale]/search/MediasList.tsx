import React, {useState} from "react";
import useModal from "@/contexts/ModalContext";
import {iGenre} from "@/types/genre";
import useResponsiveSize from "@/hooks/useResponsiveSize";
import {useTranslations} from "next-intl";
import CloseButton from "@/components/ui/Button/CloseButton";
import {SortIcon} from "@/components/Icons";
import {iMedia} from "@/types/media";
import TextButton from "@/components/ui/Button/TextButton";
import useAuth from "@/contexts/AuthContext";
import MediaCardList from "@/app/[locale]/search/MediaCardList";
import {iSort, tSort} from "@/types/utils";

export default function MediasList({mediaSets, sort, changeSort, genre} : {mediaSets?: iMedia[], sort: iSort, changeSort: (type: tSort, side: boolean) => void, genre: undefined | iGenre}) {
    const {openModal} = useModal();
    const {user} = useAuth();
    const [filterGenre, setFilterGenre] = useState<iGenre[]>(genre === undefined ? [] : [genre])
    const size = useResponsiveSize();
    const t = useTranslations("search");

    const sortOptions: {type: tSort, label: string}[] = [
        {type: "title", label: t("sort.title")},
        {type: "year", label: t("sort.year")},
        {type: "genre", label: t("sort.genre")},
        {type: "grade", label: t("sort.rating")},
    ];

    let sortedMedias = mediaSets;
    if (sortedMedias) {
        if (sort.type === "grade")
            sortedMedias = sortedMedias.sort((a, b) => a.rating - b.rating);
        else if (sort.type === "year")
            sortedMedias = sortedMedias.sort((a, b) => parseInt(a.year) - parseInt(b.year));
        else if (sort.type === "title")
            sortedMedias = sortedMedias.sort((a, b) => b.title.localeCompare(a.title));

        if (sort.side)
            sortedMedias = sortedMedias.reverse();

        if (filterGenre.length > 0 && size === "xl")
            sortedMedias = sortedMedias.filter(m => {
                for (let i = 0; i < filterGenre.length; i++) {
                    if (m.genres && !m.genres.includes(filterGenre[i].id))
                        return false;
                }
                return true;
            })
    }


    const handleSort = (sortOption: tSort) => {
        if (sortOption === "genre")
            openModal({type: "filter-genre", filterGenre: [filterGenre, setFilterGenre]})
        else
            changeSort(sortOption, sort.type === sortOption ? !sort.side : true)
    }

    const deleteGenre = (genre: iGenre[]) => {
        let newGenre = filterGenre.filter(g => !genre.find(deletedGenre => deletedGenre.id === g.id));
        if (newGenre.length === filterGenre.length)
            newGenre = filterGenre.slice(0, 2);
        setFilterGenre(newGenre);
    }

    const classNames = ["sm:pl-3", "", "hidden lg:table-cell", "hidden sm:table-cell"]

    return (<div>
        <table className="table-fixed w-full overflow-hidden">
            <colgroup>
                <col className="w-30 sm:w-55 xl:w-80" />
                <col />
                <col className="w-0" />
                <col className="w-1/5 hidden lg:table-column" />
                <col className="w-20 hidden sm:table-column" />
                <col className="w-32" />
            </colgroup>

            <thead>
            <tr className="text-left align-top">
                <th />
                {sortOptions.map((sortOption, i) =>
                    <th key={sortOption.type} className={classNames[i]}>
                        <button className={"relative gap-1 flex items-center capitalize text-nowrap font-normal hover:underline text-xs sm:text-base" + (sortOption.type === "year" ? " -left-4 sm:-left-20 md:-left-30 xl:-left-45 2xl:-left-80" : "")}
                                onClick={() => handleSort(sortOption.type)}>
                            {sortOption.label} {sortOption.type === sort.type && <SortIcon sideUp={sort.side} />}
                        </button>
                        {sortOption.type === "genre" && <SelectedGenre genres={filterGenre} deleteGenre={deleteGenre}/>}
                    </th>
                )}
                <th />
            </tr>
            </thead>
            <tbody>
            {sortedMedias ?
                sortedMedias.map((media) => (<MediaCardList key={media.id} media={media} setFilterGenre={setFilterGenre} user={user}/>)) :
                [...Array(6)].map((_, i) => (<MediaCardList key={i} setFilterGenre={setFilterGenre}/>))
            }
            </tbody>
        </table>
        {(sortedMedias && sortedMedias.length === 0) &&
            <TextButton className="w-full italic py-4" onClick={() => deleteGenre(filterGenre)}>{t("noResultsResetFilter")}</TextButton>}
    </div>);
}

function SelectedGenre({genres, deleteGenre}: {genres: iGenre[], deleteGenre:(genre: iGenre[]) => void}) {
    const showGenres = genres.slice(0, 2);
    const t = useTranslations("search");

    const GenreTag = (id: number, name: string, onClick: () => void) => <div key={id} className="border flex items-center">
        <span className="font-hairline tracking-wider text-sm px-2 text-nowrap">{name}</span>
        <CloseButton size={20} className="border-l px-1" onClickAction={onClick} />
    </div>;

    return (<div className="flex gap-2">
        {showGenres.map((genre, index) => GenreTag(index, genre.name, () => deleteGenre([genre])))}
        {genres.length > 2 && GenreTag(-1, t("selectedGenres.more", {count: genres.length - 2}), () => deleteGenre(genres.slice(2)))}
    </div>);
}
