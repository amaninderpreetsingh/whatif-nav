module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === "test";

  if (isTest) {
    return {
      presets: [
        ["@babel/preset-env", { targets: { node: "current" } }],
        "@babel/preset-typescript",
        ["@babel/preset-react", { runtime: "automatic" }],
      ],
    };
  }

  return {
    presets: ["babel-preset-expo"],
  };
};
