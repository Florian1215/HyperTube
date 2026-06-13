import {useTranslations} from "next-intl";
import {iUser} from "@/types/user";
import ProfilePicture from "@/components/ProfilePicture";
import Button from "@/components/ui/Button/Button";
import TextButton from "@/components/ui/Button/TextButton";

export default function AvatarSection({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    const colors = ["yellow", "pink", "green", "purple", "blue", "red"];
    const t = useTranslations("profile");

    const handleNewPP = (newPP: string | null) => {if (updateUser) updateUser({profile_picture: newPP});}
    const handleSwitchColors = (newColor: string) => {if (updateUser) updateUser({color: newColor});}
    const uploadNewPP = () => {handleNewPP("/images/profile_pictures.jpeg");}

    return (<div className="flex flex-col gap-2 items-center justify-center">
        <ProfilePicture user={user} size={2} className="mb-6" onClick={uploadNewPP}/>
        <Button onClick={uploadNewPP}>{t("selectNewAvatar")}</Button>

        <TextButton
            className={user.profile_picture ? "text-red  custom-underline-red" : "custom-no-underline"}
            onClick={() => handleNewPP(null)}>{t("remove")}</TextButton>

        {!user.profile_picture && (
            <div className="grid grid-cols-3 gap-2 mt-4">
                {colors.map((color, index) => (
                    <ProfilePicture
                        key={index}
                        user={user}
                        color={color}
                        className={user.color === color ? "border-3" : ""}
                        onClick={() => handleSwitchColors(color)}
                    />))}
            </div>)}
    </div>);
}
