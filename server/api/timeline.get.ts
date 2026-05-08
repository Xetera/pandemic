export default defineCachedEventHandler(
  () => {
    const config = useRuntimeConfig();
    return $fetch("https://hantavirus.one/data/news.json", {
      headers: config.identityHeaders,
    });
  },
  { maxAge: 60 * 10, staleMaxAge: -1 },
);
