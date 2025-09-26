import { CharacterService } from "~/server/services";

export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const page = query?.page ? Number.parseInt(query.page as string) : 1;

        return await CharacterService.getCharacterIds(page, 100000);
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        base: "redis",
        getKey: (event) => {
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            return `characters:index:page:${page}`;
        },
    }
);
