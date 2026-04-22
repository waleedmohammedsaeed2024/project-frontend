export interface ServiceError {
  message: string
  code?: string
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message)
  }
}

export function assertNoError(error: { message: string } | null): void {
  if (error) throw new AppError(error.message)
}
