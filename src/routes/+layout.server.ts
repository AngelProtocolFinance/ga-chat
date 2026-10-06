import { APP_NAME } from "$app/env/private";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = () => ({ app_name: APP_NAME });
