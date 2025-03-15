export default {
  name: "test",
  description: "Test command",
  longRunning: false,
  run: async () => {
    return { response: "Test command" };
  },
};
