import {iMedia, iMediaDetails} from "@/types/media";
//
// export interface iMovie extends iMedia {
// }

export interface iMovieDetails extends iMedia, iMediaDetails {
    runtime: number
    status: "Rumored" | "Planned" | "In Production" | "Post Production" | "Released" | "Canceled"
}
