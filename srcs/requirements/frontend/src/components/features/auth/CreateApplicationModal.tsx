"use client";

import React from "react";
import {useTranslations} from "next-intl";
import useModal from "@/contexts/ModalContext";
import ModalLayout from "@/components/layout/ModalLayout";
import Form from "@/components/ui/Form";
import {patchApp, postNewApp} from "@/services/auth.service";
import {iApplication, tResponse} from "@/types/api";
import useNotification from "@/contexts/NotificationContext";

// todo fix probleme
// todo add field verification
// todo handle edit field
// todo test sign in with hypertube
// todo make page /auth/autorize
// todo fix tab responsive
// todo make API documentation page

export default function CreateApplicationModal() {
    const {activeModal, closeModal} = useModal();
    const tCreate = useTranslations("profile.application.createModal");
    const tEdit = useTranslations("profile.application.editModal");
    const {addNotification} = useNotification();
    const tSuccess = useTranslations("notifications.success");

    if (activeModal.type !== "application")
        return null;

    const isCreate = activeModal.appId === undefined;
    const t = isCreate ? tCreate : tEdit;

    const handleCreateNewApp = (data: tResponse<iApplication>) => {
        if (data) {
            closeModal();
            if (activeModal.setApplications) {
                activeModal.setApplications(data.data);
                addNotification(tSuccess(isCreate ? "applicationCreated" : "applicationEdited"), "success");
            }
        }
    }

    return (<ModalLayout onCloseAction={closeModal} title={t("title")} addMaxWTitle={false}>
        <Form formType="application" request={isCreate ? postNewApp : patchApp} handleRequest={handleCreateNewApp} t={t}
              fields={["name", "uri", "scope"]} extraParam={activeModal.appId} />
    </ModalLayout>);
}
