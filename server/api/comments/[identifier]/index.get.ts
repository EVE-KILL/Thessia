export default defineEventHandler(async (event) => {
  const identifier = event.context.params?.identifier;

  console.log(identifier);

  return {};
});
