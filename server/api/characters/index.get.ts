export default defineCachedEventHandler(
    async (event) => {
        const query = getQuery(event);
        const page = query?.page ? Number.parseInt(query.page as string) : 1;
        const characters: ICharacter[] = await Characters.find(
            {},
            { character_id: 1 },
            { limit: 100000, skip: (page - 1) * 100000 }
        );

        // Return a single array containing all the IDs
        return characters.map((character) => character.character_id);
    },
    {
        maxAge: 3600,
        staleMaxAge: -1,
        swr: true,
        getKey: (event) => {
            const query = getQuery(event);
            const page = query?.page ? query.page.toString() : "1";
            return `characters:index:page:${page}`;
        },
    }
);
