import createMiddleware from "next-intl/middleware";
import {routing} from "@/i18n/request";

export default createMiddleware(routing);
