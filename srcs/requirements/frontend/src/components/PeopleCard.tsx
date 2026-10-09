import {useTranslations} from "next-intl";
import {Link} from "@/i18n/navigation";
import {iPeople} from "@/types/media";
import LoadingImage from "@/components/ui/LoadingImage";
import SmallText from "@/components/ui/SmallText";
import PeopleWatchedCount from "@/components/PeopleWatchedCount";

export default function PeopleCard({people}: {people: iPeople}) {
    const t = useTranslations("people");
    const departmentKey = `departments.${people.department}`;
    const department = people.department && (t.has(departmentKey) ? t(departmentKey) : people.department);
    const href = `/people/${people.id}`;

    return (<div className="flex gap-3 items-center min-w-0 p-3 group">
        <Link href={href} className="relative border w-64 shrink-0 overflow-hidden aspect-3/2">
            <div className="custom-noise opacity-30"/>
            {
                people.picture ?
                    <LoadingImage className="size-full object-cover" src={people.picture} alt={people.name} height={200} width={200}/> :
                    <div className="size-full bg-gray"/>
            }
        </Link>
        <div className="flex flex-col items-start min-w-0">
            <div className="flex items-center gap-2 max-w-full">
                <Link href={href} className="font-bold truncate text-dblack group-hover:underline underline-offset-2">{people.name}</Link>
                <PeopleWatchedCount people={people}/>
            </div>
            {department && <SmallText>{department}</SmallText>}
            {people.known_for && people.known_for.length > 0 &&
            <p className="inline">
                {people.known_for.map((media, index) => (<span key={index}>
                    <Link className="custom-underline text-dblack" href={`/${media.type}/${media.id}`}>{media.title}</Link>
                    {index < people.known_for!.length - 1 && " , "}
                </span>))}
            </p>}
        </div>
    </div>);
}
