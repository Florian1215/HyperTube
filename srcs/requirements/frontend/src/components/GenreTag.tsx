import {useRouter} from "@/i18n/navigation";
import {iGenre} from "@/types/genre";
import {Dispatch, SetStateAction} from "react";
import TagButton from "@/components/ui/Button/TagButton";

export default function GenreTag({children, closeModal, setFilterGenre, selected}: {children: iGenre, closeModal?: () => void, setFilterGenre?: Dispatch<SetStateAction<iGenre[]>>, selected?: boolean}) {
    const router = useRouter();

    const handleClick = () => {
        if (setFilterGenre)
            setFilterGenre((prev: iGenre[]) => {
                if (!prev.includes(children))
                        return [...prev, children];
                if (selected === undefined)
                    return prev;
                return prev.filter(g => g !== children);
            });
        else
            router.push(`/search?type=movies&genre=${children.id}`);
        if (closeModal)
            closeModal();
    }
    return (<TagButton onClick={handleClick} selected={selected}>
        {children.name}
    </TagButton>);
}
