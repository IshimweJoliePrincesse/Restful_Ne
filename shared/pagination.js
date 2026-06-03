function getPagination(queryParams, allowedSortFields = ['createdAt'], defaultSort = '-createdAt') {
  const page = Math.max(parseInt(queryParams.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(queryParams.limit || '10', 10), 1), 100);
  const requestedSort = String(queryParams.sort || defaultSort);
  const direction = requestedSort.startsWith('-') ? 'desc' : 'asc';
  const field = requestedSort.replace(/^-/, '');
  const sortField = allowedSortFields.includes(field) ? field : allowedSortFields[0];

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sortField]: direction },
  };
}

function paginatedResponse(data, total, page, limit) {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = { getPagination, paginatedResponse };
