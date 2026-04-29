export class AppError extends Error {
  constructor(
    message: string,
    public status = 500,
    public code = "INTERNAL_ERROR"
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request") {
    super(message, 400, "BAD_REQUEST")
    this.name = "BadRequestError"
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED")
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN")
    this.name = "ForbiddenError"
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT")
    this.name = "ConflictError"
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Too many requests") {
    super(message, 429, "RATE_LIMITED")
    this.name = "TooManyRequestsError"
  }
}

export class ConfigurationError extends AppError {
  constructor(message = "Application is not configured correctly") {
    super(message, 500, "CONFIGURATION_ERROR")
    this.name = "ConfigurationError"
  }
}
