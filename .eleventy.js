module.exports = function (eleventyConfig) {
  // Copy các file/tài nguyên tĩnh nguyên trạng, không qua xử lý template
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("vn30-prices.json");
  eleventyConfig.addPassthroughCopy("vnindex-history.json");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes"
    },
    templateFormats: ["njk", "md"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
