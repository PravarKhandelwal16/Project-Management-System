// Optional pagination preserves the legacy unpaged array contract for web clients.
function pagination(options = {}) {
  if (options.page === undefined && options.limit === undefined) return null;
  const page = Number(options.page ?? 1), limit = Number(options.limit ?? 20);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw Object.assign(new Error('page must be 1?10000 and limit must be 1?100.'), { statusCode: 400 });
  }
  return { page, limit, offset: (page - 1) * limit };
}
function pageResult(rows, page) {
  if (!page) return rows;
  const data = rows.slice(0, page.limit);
  Object.defineProperty(data, 'pagination', { value: { page: page.page, limit: page.limit, has_more: rows.length > page.limit } });
  return data;
}
module.exports = { pagination, pageResult };
