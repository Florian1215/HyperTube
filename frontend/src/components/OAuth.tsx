import {Button} from "@/components/Buttons";
import React from "react";
import {handleOauth} from "@/services/auth";

export type tOauthService = "42" | "github";

export function OauthServices() {
    return (<div className="flex w-full">
        <Button onClick={() => handleOauth("42")} >42</Button>
        <Button onClick={() => handleOauth("github")} >Github</Button>
    </div>);
}
