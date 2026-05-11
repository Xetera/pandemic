export default defineCachedEventHandler(
  () => {
    const config = useRuntimeConfig();
    return $fetch("https://hantavirus.one/data/countries.json", {
      headers: config.identityHeaders,
    });
  },
  { maxAge: 60 * 10 },
);
