/** Turns validated { page, pageSize } into Prisma skip/take. */
export const pageArgs = ({ page, pageSize }) => ({ skip: (page - 1) * pageSize, take: pageSize });

/** The standard list envelope returned by every paginated endpoint. */
export const pageResult = (items, { page, pageSize }, total) => ({ items, page, pageSize, total });
