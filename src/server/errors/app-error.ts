export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const errors = {
  unauthorized: () => new AppError(401, 'UNAUTHORIZED', 'ابتدا وارد حساب خود شوید.'),
  forbidden: () => new AppError(403, 'FORBIDDEN', 'دسترسی مجاز نیست.'),
  notFound: (what = 'مورد') => new AppError(404, 'NOT_FOUND', `${what} پیدا نشد.`),
  conflict: (message: string) => new AppError(409, 'CONFLICT', message),
  invalidCredentials: () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'ایمیل یا رمز عبور نادرست است.'),
};
