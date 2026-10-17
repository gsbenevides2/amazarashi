import { Elysia } from "elysia";
import { elysiaOtel } from "../instrumentation/elysia";
import { admin } from "./modules/admin";
import { releasesModule } from "./modules/releases";
import { siteModule } from "./modules/site";
import { songsModule } from "./modules/songs";
import { docs } from "./openapi";

export const app = new Elysia({ prefix: "/api" }).use(elysiaOtel).use(docs).use(releasesModule).use(songsModule).use(siteModule).use(admin);
