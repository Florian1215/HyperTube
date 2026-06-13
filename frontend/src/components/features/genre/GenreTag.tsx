import {useRouter} from "next/navigation";
import {iGenre} from "@/types/genre";
import {Dispatch, SetStateAction} from "react";

export default function GenreTag({children, closeModal, setFilterGenre}: {children: iGenre, closeModal?: () => void, setFilterGenre?: Dispatch<SetStateAction<iGenre[]>>}) {
    const router = useRouter();

    const handleClick = () => {
        if (setFilterGenre)
            setFilterGenre((prev: iGenre[]) => {
                if (!prev.includes(children))
                    return [...prev, children];
                return prev;
            });
        else
            router.push(`/movies?genre=${children.id}`);
        if (closeModal)
            closeModal();
    }
    return (<button onClick={handleClick} className="text-nowrap px-3 custom-condensed border text-2xl custom-btn">
        {children.name}
    </button>);
}
