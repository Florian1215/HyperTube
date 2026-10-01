import {iUser} from "@/types/user";
import {iMedia} from "@/types/media";

export interface iComment {
    id: number
    user: iUser
    content: string
    edited: boolean
    updated_at: number
}

export interface iCommentDetails extends iComment {
    media: iMedia
}
