import {useLocale} from "next-intl";

export default function useFormatDate(date?: string) {
    const locale = useLocale();

    if (date === undefined)
        return ;

    const formatDate = new Date(date);
    return formatDate.toLocaleDateString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}
