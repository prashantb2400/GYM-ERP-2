import { NextResponse } from 'next/server';
import { z } from 'zod';

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationFailure {
  success: false;
  response: NextResponse;
  error: string;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

/**
 * Safely parses and validates a JSON request body using a Zod schema.
 * Handles empty bodies, malformed JSON, and schema violations without throwing unhandled exceptions.
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<ValidationResult<T>> {
  let rawBody: unknown;

  try {
    const text = await request.text();
    if (!text || !text.trim()) {
      return {
        success: false,
        error: 'Request body cannot be empty',
        response: NextResponse.json(
          { error: 'Request body cannot be empty' },
          { status: 400 }
        ),
      };
    }
    rawBody = JSON.parse(text);
  } catch (err: unknown) {
    return {
      success: false,
      error: 'Malformed or invalid JSON payload',
      response: NextResponse.json(
        { error: 'Malformed or invalid JSON payload' },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(rawBody);

  if (!result.success) {
    const issue = result.error.issues[0];
    const pathStr = issue?.path?.length ? ` at ${issue.path.join('.')}` : '';
    const message = issue ? `${issue.message}${pathStr}` : 'Invalid request payload';

    return {
      success: false,
      error: message,
      response: NextResponse.json(
        {
          error: message,
          issues: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

/**
 * Validates URL search query parameters against a Zod schema.
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>
): ValidationResult<T> {
  const queryObj: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    queryObj[key] = val;
  });

  const result = schema.safeParse(queryObj);

  if (!result.success) {
    const issue = result.error.issues[0];
    const pathStr = issue?.path?.length ? ` for param '${issue.path.join('.')}'` : '';
    const message = issue ? `${issue.message}${pathStr}` : 'Invalid query parameters';

    return {
      success: false,
      error: message,
      response: NextResponse.json(
        {
          error: message,
          issues: result.error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      ),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}
