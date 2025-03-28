import redis from "unstorage/drivers/redis";

export default defineNitroPlugin(() => {
    const storage = useStorage();
    storage.mount(
        "/redis",
        redis({
            url: `redis://${process.env.REDIS_URI}:${process.env.REDIS_PORT}/${process.env.REDIS_DB || 0}`,
        })
    )
});
