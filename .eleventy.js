module.exports = function (eleventyConfig) {
  // Filter định dạng ngày kiểu Việt Nam, ví dụ: 23 Tháng 7, 2026
  eleventyConfig.addFilter("vnDate", function (dateObj) {
    const thangViet = [
      "1", "2", "3", "4", "5", "6",
      "7", "8", "9", "10", "11", "12"
    ];
    const d = new Date(dateObj);
    const day = d.getDate();
    const month = thangViet[d.getMonth()];
    const year = d.getFullYear();
    return `${day} Tháng ${month}, ${year}`;
  });
  // Copy các file/tài nguyên tĩnh nguyên trạng, không qua xử lý template
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("admin");
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("vn30-prices.json");
  eleventyConfig.addPassthroughCopy("vnindex-history.json");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("CNAME");
  return {
    pathPrefix: "/",
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
