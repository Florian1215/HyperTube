import {useTranslations} from "next-intl";
import useNotification from "@/contexts/NotificationContext";
import {iUser, iUserToken} from "@/types/user";
import {patchUser} from "@/services/users.service";
import Form from "@/components/ui/Form";

export default function ProfileSection({user, updateUser}: {user: iUser, updateUser?: (patch: Partial<iUser>) => void}) {
    const {addNotification} = useNotification();
    const t = useTranslations("profile.fields");
    const tSuccess = useTranslations("notifications.success");

    const handleUpdateUser = (data: iUserToken | iUser) => {
        if ("username" in data) {
            if (updateUser)
                updateUser(data);
            addNotification(tSuccess("infoChanged"), "success");
        }
    };

    return (<div className="flex flex-col gap-4 items-start">
        <Form formType="update" request={patchUser} handleRequest={handleUpdateUser} t={t} extraParam={user.id}
              fields={["email", "first_name", "last_name", "username"]} />
    </div>);
}
