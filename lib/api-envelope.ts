import { NextResponse } from "next/server";

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: init?.status ?? 200, ...init });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  details?: Record<string, unknown>,
) {
  const body: ApiErrorBody = { error: { code, message, details } };
  return NextResponse.json(body, { status });
}
